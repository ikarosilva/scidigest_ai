
import React, { useState, useMemo } from 'react';
import { Article } from '../types';
import ArticleCard from './ArticleCard';

interface QueueSectionProps {
  articles: Article[];
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onRead: (article: Article) => void;
  onNavigateToNote: (noteId: string) => void;
  allNotes: any[];
}

type SortOption = 'time' | 'topic' | 'rating';

const QueueSection: React.FC<QueueSectionProps> = ({ articles, onUpdateArticle, onRead, onNavigateToNote, allNotes }) => {
  const [sortBy, setSortBy] = useState<SortOption>('time');

  const queueArticles = useMemo(() => {
    return articles.filter(a => a.isInQueue);
  }, [articles]);

  const sortedArticles = useMemo(() => {
    const list = [...queueArticles];
    switch (sortBy) {
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'topic':
        return list.sort((a, b) => (a.tags[0] || '').localeCompare(b.tags[0] || ''));
      case 'time':
      default:
        return list.sort((a, b) => new Date(b.queueDate || 0).getTime() - new Date(a.queueDate || 0).getTime());
    }
  }, [queueArticles, sortBy]);

  const handleRemove = (id: string) => {
    onUpdateArticle(id, { isInQueue: false });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>⏳</span> Queue
          </h2>
          <p className="text-slate-400 mt-1">Your prioritized papers awaiting deep analysis.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-black text-slate-500 ml-3 tracking-widest">Sort By</span>
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

      {sortedArticles.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-24 text-center">
           <div className="bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
             <span className="text-4xl">📭</span>
           </div>
           <h3 className="text-xl font-bold text-slate-300">Your queue is empty</h3>
           <p className="text-slate-500 mt-2 max-w-sm mx-auto">Add papers from your feeds, trending, or library to the queue to prioritize your reading time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedArticles.map((article) => (
            <div key={article.id} className="relative group">
              <ArticleCard 
                article={article} 
                onUpdate={onUpdateArticle} 
                onRead={() => onRead(article)}
                onNavigateToNote={onNavigateToNote}
                allNotes={allNotes}
              />
              <button 
                onClick={() => handleRemove(article.id)}
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
