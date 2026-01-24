
/* global gapi, google */
declare const gapi: any;
declare const google: any;

import { dbService } from './dbService';

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILENAME = 'scidigest_sync_v1_enc.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Encryption Helpers using Web Crypto API
async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(data)
  );
  
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encoded: string, password: string): Promise<string> {
  const decoder = new TextDecoder();
  const combined = new Uint8Array(atob(encoded).split("").map(c => c.charCodeAt(0)));
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, encrypted
  );
  
  return decoder.decode(decrypted);
}

export const cloudSyncService = {
  init: (onStatusChange: (status: string) => void) => {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiInited = true;
        cloudSyncService.checkInit(onStatusChange);
      });
    };
    document.body.appendChild(script);

    const gisScript = document.createElement('script');
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
      });
      gisInited = true;
      cloudSyncService.checkInit(onStatusChange);
    };
    document.body.appendChild(gisScript);
  },

  checkInit: (onStatusChange: (status: string) => void) => {
    if (gapiInited && gisInited) {
      const hasAuth = !!localStorage.getItem('scidigest_google_token');
      onStatusChange(hasAuth ? 'synced' : 'disconnected');
    }
  },

  signIn: (callback: (success: boolean) => void) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) { callback(false); return; }
      localStorage.setItem('scidigest_google_token', resp.access_token);
      callback(true);
    };
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  },

  signOut: () => {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => {});
      gapi.client.setToken(null);
      localStorage.removeItem('scidigest_google_token');
    }
  },

  findSyncFile: async () => {
    const response = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
      q: `name = '${SYNC_FILENAME}'`,
    });
    return response.result.files?.[0];
  },

  uploadData: async (data: any) => {
    const syncKey = dbService.getSyncKey();
    if (!syncKey) return false;

    try {
      const file = await cloudSyncService.findSyncFile();
      const metadata = {
        name: SYNC_FILENAME,
        mimeType: 'application/json',
        parents: file ? undefined : ['appDataFolder'],
      };

      // ENCRYPT BEFORE UPLOAD
      const encryptedContent = await encryptData(JSON.stringify(data), syncKey);
      const payload = JSON.stringify({ ciphertext: encryptedContent, encrypted: true });

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          payload +
          close_delim;

      const request = gapi.client.request({
        path: file ? `/upload/drive/v3/files/${file.id}` : '/upload/drive/v3/files',
        method: file ? 'PATCH' : 'POST',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body: multipartRequestBody,
      });

      await request;
      return true;
    } catch (e) {
      console.error("Cloud Upload Failed", e);
      return false;
    }
  },

  downloadData: async (fileId: string) => {
    const syncKey = dbService.getSyncKey();
    if (!syncKey) return null;

    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      
      const payload = response.result;
      if (payload && payload.ciphertext && payload.encrypted) {
        // DECRYPT AFTER DOWNLOAD
        const decrypted = await decryptData(payload.ciphertext, syncKey);
        return JSON.parse(decrypted);
      }
      return payload; // Fallback for unencrypted legacy
    } catch (e) {
      console.error("Cloud Download Failed", e);
      return null;
    }
  }
};
