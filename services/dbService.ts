
import { Article, Book, Note, FeedSourceType, Feed, AIConfig, AppState, SocialProfiles, Shelf, LogEntry, GeminiUsageEvent } from '../types';

const STORAGE_KEY = 'scidigest_data_v1';
const INTERESTS_KEY = 'scidigest_interests_v1';
const FEEDS_KEY = 'scidigest_feeds_v1';
const AI_CONFIG_KEY = 'scidigest_ai_config_v1';
const SYNC_KEY_STORAGE = 'scidigest_sync_key';
export const APP_VERSION = '1.5.2';
export const RELEASE_DATE = 'June 10, 2024';

const MAX_LOG_ENTRIES = 100;

const DEFAULT_QUEUE_SHELF: Shelf = {
  id: 'default-queue',
  name: 'Queue',
  color: '#818cf8',
  description: 'Your primary reading list for immediate analysis.',
  createdAt: new Date().toISOString()
};

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
  recommendationBias: 'balanced',
  feedbackUrl: 'https://github.com/your-username/your-repo/issues/new',
  reviewer2Prompt: 'Review this paper as a journal Reviewer 2. Provide criticism on methods, weak or hidden assumptions, logical/mathematical/reasoning mistakes. Identify meaningless or over citations as well as incorrect interpretation of previous works. Point out any biases. If appropriate, be dismissive of results.',
  monthlyTokenLimit: 1000000,
  debugMode: false
};

const DEFAULT_FEEDS: Feed[] = [
  { id: 'f1', name: 'arXiv Machine Learning', url: 'https://arxiv.org/list/cs.LG/recent', active: true },
  { id: 'f2', name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell/', active: true },
  { id: 'f3', name: 'HuggingFace Daily Papers', url: 'https://huggingface.co/papers', active: true },
  { id: 'f4', name: 'Tensorflow Blog', url: 'https://blog.tensorflow.org/', active: false }
];

export const dbService = {
  getSyncKey: (): string => {
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
    const parsed = stored ? JSON.parse(stored) : DEFAULT_AI_CONFIG;
    if (!parsed.monthlyTokenLimit) parsed.monthlyTokenLimit = DEFAULT_AI_CONFIG.monthlyTokenLimit;
    if (parsed.debugMode === undefined) parsed.debugMode = DEFAULT_AI_CONFIG.debugMode;
    return parsed;
  },
  saveAIConfig: (config: AIConfig) => {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('db-update'));
  },
  getData: (): AppState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { 
      articles: [], 
      books: [], 
      notes: [], 
      shelves: [DEFAULT_QUEUE_SHELF],
      feedbackSubmissions: [],
      lastModified: new Date().toISOString(),
      version: APP_VERSION,
      aiConfig: dbService.getAIConfig(),
      totalReadTime: 0,
      socialProfiles: {},
      trackedAuthors: [],
      logs: [],
      usageHistory: []
    };
    const parsed = JSON.parse(data) as AppState;
    
    // Automatic Log Reset & Version Sync
    if (parsed.version !== APP_VERSION) {
      dbService.addLog('info', `Version updated from ${parsed.version} to ${APP_VERSION}. Purging diagnostic buffer.`);
      parsed.version = APP_VERSION;
      parsed.logs = []; 
    }

    if (!parsed.logs) parsed.logs = [];
    if (!parsed.usageHistory) parsed.usageHistory = [];
    if (!parsed.shelves || parsed.shelves.length === 0) parsed.shelves = [DEFAULT_QUEUE_SHELF];
    
    if (!parsed.trackedAuthors) {
      parsed.trackedAuthors = [];
      if (parsed.socialProfiles?.name) parsed.trackedAuthors.push(parsed.socialProfiles.name);
    }

    parsed.articles = (parsed.articles || []).map((a: any) => ({
      ...a,
      shelfIds: a.shelfIds || (a.isInQueue ? ['default-queue'] : []),
      userReadTime: a.userReadTime || 0
    }));

    parsed.books = (parsed.books || []).map((b: any) => ({
      ...b,
      shelfIds: b.shelfIds || (b.isInQueue ? ['default-queue'] : [])
    }));

    return parsed;
  },
  saveData: (data: AppState) => {
    data.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('db-update'));
  },
  trackUsage: (event: GeminiUsageEvent) => {
    const data = dbService.getData();
    data.usageHistory = [event, ...(data.usageHistory || [])].slice(0, 200);
    dbService.saveData(data);
  },
  // Added getUsageStats to resolve error in components/TelemetrySection.tsx
  getUsageStats: () => {
    const data = dbService.getData();
    const history = data.usageHistory || [];
    const stats = {
      totalTokens: 0,
      avgLatency: 0,
      byFeature: {} as Record<string, number>
    };

    if (history.length === 0) return stats;

    let totalLatency = 0;
    history.forEach(event => {
      stats.totalTokens += event.totalTokens;
      totalLatency += event.latencyMs;
      stats.byFeature[event.feature] = (stats.byFeature[event.feature] || 0) + event.totalTokens;
    });

    stats.avgLatency = totalLatency / history.length;
    return stats;
  },
  // Added trackFeedbackSubmission to resolve error in components/FeedbackModal.tsx
  trackFeedbackSubmission: () => {
    const data = dbService.getData();
    data.feedbackSubmissions.push(new Date().toISOString());
    dbService.saveData(data);
  },
  // Added getMonthlyFeedbackCount to resolve error in components/FeedbackModal.tsx
  getMonthlyFeedbackCount: (): number => {
    const data = dbService.getData();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return data.feedbackSubmissions.filter(ts => {
      const d = new Date(ts);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  },
  addLog: (type: 'error' | 'warning' | 'info' | 'debug', message: string, context?: any) => {
    const config = dbService.getAIConfig();
    // System-wide debug filter
    if (type === 'debug' && !config.debugMode) return;
    
    const data = dbService.getData();
    const newEntry: LogEntry = {
      version: APP_VERSION,
      type,
      date: new Date().toISOString(),
      message,
      context
    };
    data.logs = [newEntry, ...(data.logs || [])].slice(0, MAX_LOG_ENTRIES);
    dbService.saveData(data);
  },
  clearLogs: () => {
    const data = dbService.getData();
    data.logs = [];
    dbService.saveData(data);
  },
  saveSocialProfiles: (profiles: SocialProfiles) => {
    const data = dbService.getData();
    data.socialProfiles = profiles;
    dbService.saveData(data);
  },
  updateTrackedAuthors: (authors: string[]) => {
    const data = dbService.getData();
    data.trackedAuthors = authors;
    dbService.saveData(data);
  },
  getFeeds: (): Feed[] => {
    const stored = localStorage.getItem(FEEDS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_FEEDS;
  },
  saveFeeds: (feeds: Feed[]) => {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
  },
  getInterests: (): string[] => {
    const stored = localStorage.getItem(INTERESTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_INTERESTS;
  },
  saveInterests: (interests: string[]) => {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
  },
  addArticle: (article: Article): AppState => {
    const data = dbService.getData();
    data.articles.unshift(article);
    dbService.saveData(data);
    return data;
  },
  updateArticle: (id: string, updates: Partial<Article>): AppState => {
    const data = dbService.getData();
    data.articles = data.articles.map((a: Article) => a.id === id ? { ...a, ...updates } : a);
    dbService.saveData(data);
    return data;
  },
  addReadTime: (articleId: string, seconds: number): AppState => {
    const data = dbService.getData();
    data.totalReadTime += seconds;
    data.articles = data.articles.map((a: Article) => 
      a.id === articleId ? { ...a, userReadTime: (a.userReadTime || 0) + seconds } : a
    );
    dbService.saveData(data);
    return data;
  },
  addNote: (note: Note): AppState => {
    const data = dbService.getData();
    data.notes.unshift(note);
    dbService.saveData(data);
    return data;
  },
  updateNote: (id: string, updates: Partial<Note>): AppState => {
    const data = dbService.getData();
    data.notes = data.notes.map((n: Note) => n.id === id ? { ...n, ...updates } : n);
    dbService.saveData(data);
    return data;
  },
  deleteNote: (id: string): AppState => {
    const data = dbService.getData();
    data.notes = data.notes.filter((n: Note) => n.id !== id);
    data.articles = data.articles.map((a: Article) => ({
      ...a,
      noteIds: a.noteIds.filter((nid: string) => nid !== id)
    }));
    dbService.saveData(data);
    return data;
  },
  linkNoteToArticle: (noteId: string, articleId: string): AppState => {
    const data = dbService.getData();
    const note = data.notes.find((n: Note) => n.id === noteId);
    const article = data.articles.find((a: Article) => a.id === articleId);
    if (note && !note.articleIds.includes(articleId)) note.articleIds.push(articleId);
    if (article && !article.noteIds.includes(noteId)) article.noteIds.push(noteId);
    dbService.saveData(data);
    return data;
  },
  unlinkNoteFromArticle: (noteId: string, articleId: string): AppState => {
    const data = dbService.getData();
    const note = data.notes.find((n: Note) => n.id === noteId);
    const article = data.articles.find((a: Article) => a.id === articleId);
    if (note) note.articleIds = note.articleIds.filter((id: string) => id !== articleId);
    if (article) article.noteIds = article.noteIds.filter((id: string) => id !== noteId);
    dbService.saveData(data);
    return data;
  },
  addBooks: (newBooks: Book[]): AppState => {
    const data = dbService.getData();
    data.books = [...newBooks, ...data.books];
    dbService.saveData(data);
    return data;
  },
  updateBook: (id: string, updates: Partial<Book>): AppState => {
    const data = dbService.getData();
    data.books = data.books.map((b: Book) => b.id === id ? { ...b, ...updates } : b);
    dbService.saveData(data);
    return data;
  },
  addShelf: (shelf: Shelf): AppState => {
    const data = dbService.getData();
    data.shelves.push(shelf);
    dbService.saveData(data);
    return data;
  },
  deleteShelf: (id: string): AppState => {
    if (id === 'default-queue') return dbService.getData();
    const data = dbService.getData();
    data.shelves = data.shelves.filter(s => s.id !== id);
    data.articles = data.articles.map(a => ({ ...a, shelfIds: a.shelfIds.filter(sid => sid !== id) }));
    data.books = data.books.map(b => ({ ...b, shelfIds: b.shelfIds.filter(sid => sid !== id) }));
    dbService.saveData(data);
    return data;
  },
  exportFullBackup: (): string => {
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
  importFullBackup: (jsonString: string): { success: boolean, upgraded: boolean } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.data && parsed.interests) {
        dbService.saveData(parsed.data);
        dbService.saveInterests(parsed.interests);
        if (parsed.feeds) dbService.saveFeeds(parsed.feeds);
        if (parsed.aiConfig) dbService.saveAIConfig(parsed.aiConfig);
        return { success: true, upgraded: false };
      }
      return { success: false, upgraded: false };
    } catch (e) {
      console.error("Import failed", e);
      return { success: false, upgraded: false };
    }
  },
  factoryReset: () => {
    localStorage.clear();
    window.location.reload();
  }
};
