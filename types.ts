
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

export interface AIConfig {
  recommendationBias: RecommendationBias;
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
  userReadTime: number; // In seconds
  estimatedReadTime?: number; // In minutes
  shelfIds: string[]; // Replaces isInQueue
}

export interface Book {
  id: string;
  title: string;
  author: string;
  rating: number; 
  dateAdded: string;
  price?: string;
  amazonUrl?: string;
  shelfIds: string[]; // Replaces isInQueue
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
}

export type NetworkViewMode = 'notes' | 'articles' | 'topics' | 'unified' | 'datasets' | 'author';
