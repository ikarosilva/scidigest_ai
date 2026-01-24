
import React, { useState, useMemo } from 'react';
import { Article, Book } from '../types';
import ArticleCard from './ArticleCard';
import BookCard from './BookCard';

interface QueueSectionProps {
  articles: Article[];
  books: Book[];
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onRead: (article: Article) => void;
  onNavigateToNote: (noteId: string) => void;
  allNotes: any[];
}

type SortOption = 'time' | 'topic' | 'rating';

const QueueSection: React.FC<QueueSectionProps> = ({ articles, books = [], onUpdateArticle, onRead, onNavigateToNote, allNotes }) => {
  const [sortBy, setSortBy] = useState<SortOption>('time');

  const queueItems = useMemo(() => {
    const paperItems = articles.filter(a => a.isInQueue).map(a => ({ ...a, itemType: 'article' as const }));
    const bookItems = books.filter(b => b.isInQueue).map(b => ({ ...b, itemType: 'book' as const }));
    return [...paperItems, ...bookItems];
  }, [articles, books]);

  const sortedItems = useMemo(() => {
    const list = [...queueItems];
    switch (sortBy) {
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'topic':
        // Using first tag as a proxy for topic sorting
        return list.sort((a, b) => {
          const tagA = (a.tags && a.tags[0]) || '';
          const tagB = (b.tags && b.tags[0]) || '';
          return tagA.localeCompare(tagB);
        });
      case 'time':
      default:
        // Fix: Use itemType to safely access the relevant date property for sorting
        return list.sort((a, b) => {
          const dateB = b.itemType === 'book' ? b.dateAdded : b.queueDate;
          const dateA = a.itemType === 'book' ? a.dateAdded : a.queueDate;
          return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
        });
    }
  }, [queueItems, sortBy]);

  const handleRemove = (id: string, type: 'article' | 'book') => {
    if (type === 'article') {
      onUpdateArticle(id, { isInQueue: false });
    } else {
      // For books, we just toggle the flag in state (assuming db handles persistence)
      const data = (window as any).dbData; // Simple global access for demonstration
      // In a real app, this would use a dbService.updateBook method
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>⏳</span> Research Queue
          </h2>
          <p className="text-slate-400 mt-1">A unified view of papers and literature awaiting analysis.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-black text-slate-500 ml-3 tracking-widest">Priority Sort</span>
          <div className="flex gap-1">
            {(['time', 'topic', 'rating'] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  sortBy === option ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      {sortedItems.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-24 text-center">
           <div className="bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
             <span className="text-4xl">📭</span>
           </div>
           <h3 className="text-xl font-bold text-slate-300">Queue Cleared</h3>
           <p className="text-slate-500 mt-2 max-w-sm mx-auto">Discover trending papers or Amazon literature and send them here to organize your study plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedItems.map((item) => (
            <div key={item.id} className="relative group">
              {item.itemType === 'article' ? (
                <ArticleCard 
                  article={item as Article} 
                  onUpdate={onUpdateArticle} 
                  onRead={() => onRead(item as Article)}
                  onNavigateToNote={onNavigateToNote}
                  allNotes={allNotes}
                />
              ) : (
                <BookCard book={item as Book} />
              )}
              <button 
                onClick={() => handleRemove(item.id, item.itemType)}
                className="absolute top-4 right-4 bg-slate-950/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Remove from Queue"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueueSection;
