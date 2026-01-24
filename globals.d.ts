
declare module 'react-force-graph-2d';

interface Window {
  // Added optional modifier to aistudio to match system-provided definitions and fix identical modifier errors.
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

// Support for process.env in Vite
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
