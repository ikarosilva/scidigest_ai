
export enum FeedSourceType {
  HUGGINGFACE = 'HuggingFace',
  NATURE = 'Nature',
  TENSORFLOW = 'Tensorflow Blog',
  MEDIUM = 'Medium',
  GOODREADS = 'GoodReads',
  MANUAL = 'Manual',
  GOOGLE_SCHOLAR = 'Google Scholar',
  ARXIV = 'arXiv'
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
  references?: string[]; // IDs or Titles of papers this paper cites
}

export interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  dateAdded: string;
}

export interface AppState {
  articles: Article[];
  books: Book[];
  notes: Note[];
  feedbackSubmissions: string[];
  lastModified: string; // ISO Timestamp for sync
  version: string;
  aiConfig: AIConfig;
}

export type NetworkViewMode = 'notes' | 'articles' | 'unified';
