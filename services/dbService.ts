
import { Article, Book, Note, FeedSourceType, Feed, AIConfig } from '../types';

const STORAGE_KEY = 'scidigest_data_v1';
const INTERESTS_KEY = 'scidigest_interests_v1';
const FEEDS_KEY = 'scidigest_feeds_v1';
const AI_CONFIG_KEY = 'scidigest_ai_config_v1';
const SYNC_KEY_STORAGE = 'scidigest_sync_key';
export const APP_VERSION = '1.1.0';

const DEFAULT_INTERESTS = [
  "Machine Learning",
  "Deep Learning",
  "Signal Processing",
  "Statistical Processing",
  "Bayesian Analysis",
  "Biosignal Processing",
  "Wearables",
  "Physiology",
  "Sports Medicine",
  "Infectious Diseases"
];

const DEFAULT_AI_CONFIG: AIConfig = {
  recommendationBias: 'balanced'
};

const DEFAULT_FEEDS: Feed[] = [
  { id: 'f1', name: 'arXiv Machine Learning', url: 'https://arxiv.org/list/cs.LG/recent', active: true },
  { id: 'f2', name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell/', active: true },
  { id: 'f3', name: 'HuggingFace Daily Papers', url: 'https://huggingface.co/papers', active: true },
  { id: 'f4', name: 'Tensorflow Blog', url: 'https://blog.tensorflow.org/', active: false }
];

const INITIAL_ARTICLES: Article[] = [
  {
    id: 'example-1',
    title: 'Self-Supervised Learning in Wearable Biosignal Processing',
    authors: ['Chen, L.', 'Smith, J.'],
    abstract: 'A review of modern deep learning architectures applied to continuous physiological monitoring via wearable sensors.',
    date: '2024-05-12',
    year: '2024',
    source: FeedSourceType.ARXIV,
    rating: 9,
    userReviews: {
      sentiment: 'Positive',
      summary: 'Highly cited work defining the standard for transformer-based biosignal analysis.',
      lastUpdated: '2024-05-12',
      citationCount: 142,
    },
    tags: ['Wearables', 'Deep Learning'],
    isBookmarked: false,
    notes: 'Welcome to your library.',
    noteIds: []
  }
];

export const dbService = {
  getSyncKey: () => {
    let key = localStorage.getItem(SYNC_KEY_STORAGE);
    if (!key) {
      key = Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(SYNC_KEY_STORAGE, key);
    }
    return key;
  },
  setSyncKey: (key: string) => {
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  },
  getAIConfig: (): AIConfig => {
    const stored = localStorage.getItem(AI_CONFIG_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_AI_CONFIG;
  },
  saveAIConfig: (config: AIConfig) => {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  },
  getData: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { 
      articles: INITIAL_ARTICLES, 
      books: [], 
      notes: [], 
      feedbackSubmissions: [],
      lastModified: new Date().toISOString(),
      version: APP_VERSION,
      aiConfig: DEFAULT_AI_CONFIG
    };
    const parsed = JSON.parse(data);
    parsed.lastModified = parsed.lastModified || new Date().toISOString();
    parsed.aiConfig = parsed.aiConfig || DEFAULT_AI_CONFIG;
    return parsed;
  },
  saveData: (data: any) => {
    data.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  getFeeds: (): Feed[] => {
    const stored = localStorage.getItem(FEEDS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_FEEDS;
  },
  saveFeeds: (feeds: Feed[]) => {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
  },
  trackFeedbackSubmission: () => {
    const data = dbService.getData();
    data.feedbackSubmissions.push(new Date().toISOString());
    dbService.saveData(data);
  },
  getMonthlyFeedbackCount: () => {
    const data = dbService.getData();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    return (data.feedbackSubmissions || []).filter((ts: string) => new Date(ts) > thirtyDaysAgo).length;
  },
  getInterests: (): string[] => {
    const stored = localStorage.getItem(INTERESTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_INTERESTS;
  },
  saveInterests: (interests: string[]) => {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
  },
  addArticle: (article: Article) => {
    const data = dbService.getData();
    data.articles.unshift(article);
    dbService.saveData(data);
    return data;
  },
  updateArticle: (id: string, updates: Partial<Article>) => {
    const data = dbService.getData();
    data.articles = data.articles.map((a: Article) => a.id === id ? { ...a, ...updates } : a);
    dbService.saveData(data);
    return data;
  },
  addNote: (note: Note) => {
    const data = dbService.getData();
    data.notes.unshift(note);
    dbService.saveData(data);
    return data;
  },
  updateNote: (id: string, updates: Partial<Note>) => {
    const data = dbService.getData();
    data.notes = data.notes.map((n: Note) => n.id === id ? { ...n, ...updates } : n);
    dbService.saveData(data);
    return data;
  },
  deleteNote: (id: string) => {
    const data = dbService.getData();
    data.notes = data.notes.filter((n: Note) => n.id !== id);
    data.articles = data.articles.map((a: Article) => ({
      ...a,
      noteIds: a.noteIds.filter(nid => nid !== id)
    }));
    dbService.saveData(data);
    return data;
  },
  linkNoteToArticle: (noteId: string, articleId: string) => {
    const data = dbService.getData();
    const note = data.notes.find((n: Note) => n.id === noteId);
    const article = data.articles.find((a: Article) => a.id === articleId);
    if (note && !note.articleIds.includes(articleId)) note.articleIds.push(articleId);
    if (article && !article.noteIds.includes(noteId)) article.noteIds.push(noteId);
    dbService.saveData(data);
    return data;
  },
  unlinkNoteFromArticle: (noteId: string, articleId: string) => {
    const data = dbService.getData();
    const note = data.notes.find((n: Note) => n.id === noteId);
    const article = data.articles.find((a: Article) => a.id === articleId);
    if (note) note.articleIds = note.articleIds.filter((id: string) => id !== articleId);
    if (article) article.noteIds = article.noteIds.filter((id: string) => id !== noteId);
    dbService.saveData(data);
    return data;
  },
  addBooks: (newBooks: Book[]) => {
    const data = dbService.getData();
    data.books = [...newBooks, ...data.books];
    dbService.saveData(data);
    return data;
  },
  exportFullBackup: () => {
    const data = dbService.getData();
    const interests = dbService.getInterests();
    const feeds = dbService.getFeeds();
    const aiConfig = dbService.getAIConfig();
    return JSON.stringify({ 
      version: APP_VERSION,
      data, 
      interests, 
      feeds,
      aiConfig,
      timestamp: new Date().toISOString() 
    }, null, 2);
  },
  importFullBackup: (jsonString: string): { success: boolean; upgraded: boolean } => {
    try {
      const parsed = JSON.parse(jsonString);
      let dataToImport = parsed;
      let upgraded = false;
      const importedVersion = parsed.version || '1.0.0';
      if (importedVersion !== APP_VERSION) {
        if (importedVersion === '1.0.0') {
          upgraded = true;
        }
      }
      if (dataToImport.data && dataToImport.interests) {
        dbService.saveData(dataToImport.data);
        dbService.saveInterests(dataToImport.interests);
        if (dataToImport.feeds) dbService.saveFeeds(dataToImport.feeds);
        if (dataToImport.aiConfig) dbService.saveAIConfig(dataToImport.aiConfig);
        return { success: true, upgraded };
      }
      return { success: false, upgraded: false };
    } catch (e) {
      console.error("Import failed", e);
      return { success: false, upgraded: false };
    }
  }
};
