
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
    const contents = params.contents;
    let prompt = "";
    
    if (typeof contents === 'string') {
      prompt = contents;
    } else if (Array.isArray(contents)) {
      prompt = JSON.stringify(contents);
    } else if (contents && typeof contents === 'object') {
       prompt = JSON.stringify(contents);
    }

    // Default response data (used for recommendation ranking)
    let data: any = [
      { index: 0, matchedTopics: ['AI'] },
      { index: 1, matchedTopics: ['Signal Processing'] }
    ];

    // Broaden matching to be less brittle
    const p = prompt.toLowerCase();
    
    if (
      p.includes('define') || 
      p.includes('summarize') || 
      p.includes('metadata') ||
      p.includes('abstract') ||
      p.includes('synthesis') ||
      p.includes('contribution')
    ) {
      data = { 
        term: 'Neural Networks', 
        title: 'Mock Research Paper', 
        abstract: 'This is a mock abstract for testing metadata extraction.',
        definition: 'A computational model inspired by biological neurons.',
        researchContext: 'Fundamental to deep learning systems.',
        relatedTopics: ['Deep Learning', 'AI'],
        authors: ['Test Author'],
        year: 2024,
        tags: ['AI', 'Machine Learning'],
        newTopics: ['Quantum AI']
      };
    } else if (p.includes('trending') || p.includes('breakthroughs') || p.includes('scholar')) {
      data = { 
        results: [
          { title: 'Trending Paper 1', authors: ['Author A'], year: '2024', snippet: 'Insight', citationCount: 100 }
        ] 
      };
    } else if (p.includes('amazon') || p.includes('books') || p.includes('marketplace')) {
      data = { 
        books: [
          { title: 'Mock Book', author: 'Author B', price: '$50', rating: 4.5, amazonUrl: '#', description: 'Description' }
        ] 
      };
    } else if (p.includes('tag') || p.includes('trajectory') || p.includes('interest')) {
      data = { tags: ['AI', 'Neural Networks'], newTopics: ['Quantum AI'] };
    } else if (p.includes('network') || p.includes('cluster') || p.includes('graph')) {
      data = {
        nodes: [{ id: '1', name: 'Author A', cluster: 'AI', level: 1 }],
        clusters: [{ name: 'AI', color: '#ff0000' }]
      };
    } else if (p.includes('citation') || p.includes('reference')) {
      data = { references: ['Paper A', 'Paper B'] };
    }

    const mockResponseJson = JSON.stringify(data);

    return Promise.resolve({
      text: mockResponseJson,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      candidates: [{ 
        content: { parts: [{ text: mockResponseJson }] },
        groundingMetadata: { 
          groundingChunks: [
            { web: { uri: 'https://example.com', title: 'Grounding Source' } }
          ] 
        }
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
      INTEGER: 'INTEGER',
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
