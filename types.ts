
export enum FeedSourceType {
  HUGGINGFACE = 'HuggingFace',
  NATURE = 'Nature',
  TENSORFLOW = 'Tensorflow Blog',
  MEDIUM = 'Medium',
  GOODREADS = 'GoodReads',
  MANUAL = 'Manual',
  GOOGLE_SCHOLAR = 'Google Scholar',
  ARXIV = 'arXiv',
  AMAZON = 'Amazon'
}

export type Sentiment = 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
export type SyncStatus = 'disconnected' | 'synced' | 'syncing' | 'error' | 'update-available';
export type RecommendationBias = 'conservative' | 'balanced' | 'experimental';
export type QuizStatus = 'not-taken' | 'pass' | 'fail';
export type ReadingMode = 'default' | 'paper' | 'night';

export interface LogEntry {
  version: string;
  type: 'error' | 'warning' | 'info';
  date: string;
  message: string;
}

export interface AIConfig {
  recommendationBias: RecommendationBias;
  reviewer2Prompt: string;
  feedbackUrl: string;
}

export interface UserReviews {
  sentiment: Sentiment;
  summary: string;
  lastUpdated?: string;
  citationCount?: number;
  citedByUrl?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  articleIds: string[];
  lastEdited: string;
}

export interface Feed {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export interface SocialProfiles {
  name?: string;
  medium?: string;
  linkedin?: string;
  googleScholar?: string;
  usePublicWebSearch?: boolean;
}

export interface Shelf {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  quickTake?: string; // New: 1-sentence summary
  date: string;
  year: string;
  source: FeedSourceType;
  rating: number;
  pdfUrl?: string;
  sourceCode?: string;
  dataLocation?: string;
  userReviews: UserReviews;
  tags: string[];
  isBookmarked: boolean;
  notes: string;
  noteIds: string[];
  references?: string[]; 
  userReadTime: number;
  estimatedReadTime?: number;
  shelfIds: string[];
  quizStatus?: QuizStatus;
  isTracked?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  rating: number; 
  dateAdded: string;
  price?: string;
  amazonUrl?: string;
  shelfIds: string[];
  description?: string;
  tags?: string[];
}

export interface AppState {
  articles: Article[];
  books: Book[];
  notes: Note[];
  shelves: Shelf[];
  feedbackSubmissions: string[];
  lastModified: string; 
  version: string;
  aiConfig: AIConfig;
  totalReadTime: number;
  socialProfiles: SocialProfiles;
  trackedAuthors: string[];
  logs: LogEntry[];
}

export type NetworkViewMode = 'notes' | 'articles' | 'topics' | 'unified' | 'datasets' | 'author';
