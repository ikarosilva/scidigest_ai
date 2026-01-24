
declare module 'react-force-graph-2d';

interface Window {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

// Google API and Identity Services globals
declare const gapi: any;
declare const google: any;

// Support for process.env in Vite
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
