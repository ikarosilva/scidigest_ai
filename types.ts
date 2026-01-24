
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

export interface UserReviews {
  sentiment: Sentiment;
  summary: string;
  lastUpdated?: string;
  citationCount?: number;
  citedByUrl?: string;
}

export interface Article {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  date: string; // Keep full date
  year: string; // New field for prominent year display
  source: FeedSourceType;
  rating: number; // 1-10
  pdfUrl?: string;
  sourceCode?: string;
  dataLocation?: string;
  userReviews: UserReviews;
  tags: string[];
  isBookmarked: boolean;
  notes: string;
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
  feedSources: string[];
  userInterests: string[];
}
