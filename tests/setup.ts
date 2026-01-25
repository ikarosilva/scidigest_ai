
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
  const mockGenerateContent = vi.fn().mockImplementation((params) => {
    // Detect expected return type based on prompt keywords
    const contents = params.contents;
    const prompt = typeof contents === 'string' 
      ? contents 
      : JSON.stringify(contents);

    let data: any = [0, 1, 2]; // Default array for rankings

    if (prompt.includes('Define "') || prompt.includes('Analyze this scientific paper') || prompt.includes('academic metadata for')) {
      data = { 
        term: 'Neural Networks', 
        title: 'Test Paper', 
        abstract: 'Test Abstract',
        definition: 'A system of hardware and/or software patterned after the operation of neurons in the human brain.',
        researchContext: 'Fundamental to modern deep learning.',
        relatedTopics: ['Deep Learning', 'AI'],
        authors: ['Test Author'],
        year: '2024'
      };
    } else if (prompt.includes('trending papers on') || prompt.includes('Search highest rated books')) {
      data = { results: [] };
    } else if (prompt.includes('Identify which of these tags represent')) {
      data = { tags: ['AI'], newTopics: [] };
    }

    const mockResponseJson = JSON.stringify(data);

    return Promise.resolve({
      text: mockResponseJson,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      candidates: [{ 
        content: { parts: [{ text: mockResponseJson }] },
        groundingMetadata: { groundingChunks: [] }
      }]
    });
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
