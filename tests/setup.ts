
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.crypto
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      deriveKey: vi.fn().mockResolvedValue({}),
      encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      decrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    }
  }
});

// Mock process.env
(globalThis as any).process = {
  env: {
    API_KEY: 'test-api-key'
  }
};

// Mock intersection observer
class IntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', { value: IntersectionObserver });

// Mock Google API and Identity Services
(globalThis as any).gapi = {
  load: vi.fn((name, cb) => cb()),
  client: {
    init: vi.fn().mockResolvedValue({}),
    getToken: vi.fn().mockReturnValue(null),
    setToken: vi.fn(),
    request: vi.fn().mockResolvedValue({}),
    drive: {
      files: {
        list: vi.fn().mockResolvedValue({ result: { files: [] } }),
        get: vi.fn().mockResolvedValue({ result: {} }),
      }
    }
  }
};

(globalThis as any).google = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn().mockReturnValue({
        requestAccessToken: vi.fn(),
      }),
      revoke: vi.fn(),
    },
  },
};

// Mock @google/genai
vi.mock('@google/genai', () => {
  // Use a fallback that can be parsed as both array and object if needed, 
  // or handle based on prompt content in a more complex mock.
  // For basic reliability, we return an array string since several tests expect rankings or lists.
  const mockResponseJson = JSON.stringify([0, 1, 2]);

  const mockGenerateContent = vi.fn().mockResolvedValue({
    text: mockResponseJson,
    candidates: [{ content: { parts: [{ text: mockResponseJson }] } }]
  });

  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: vi.fn(),
      }
    })),
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
    },
    Modality: {
      AUDIO: 'AUDIO',
      TEXT: 'TEXT',
      IMAGE: 'IMAGE',
    }
  };
});

// Mock react-force-graph-2d to avoid canvas issues in JSDOM
vi.mock('react-force-graph-2d', () => ({
  default: () => null
}));
