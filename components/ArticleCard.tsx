
import React, { useState } from 'react';
import { Article, Sentiment, Note, Shelf } from '../types';
import { dbService } from '../services/dbService';

interface ArticleCardProps {
  article: Article;
  allNotes: Note[];
  onUpdate: (id: string, updates: Partial<Article>) => void;
  onNavigateToNote: (noteId: string) => void;
  onRead: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, allNotes, onUpdate, onNavigateToNote, onRead }) => {
  const [showShelfMenu, setShowShelfMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const shelves = dbService.getData().shelves;
  const interests = dbService.getInterests();
  
  const matchedInterests = (article.tags || []).filter(tag => 
    interests.some(interest => tag.toLowerCase() === interest.toLowerCase())
  );

  const sentimentColors: Record<Sentiment, string> = {
    Positive: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Negative: 'bg-red-500/20 text-red-400 border-red-500/30',
    Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  const hasGrounding = article.groundingSources && article.groundingSources.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-indigo-500/5 transition-all group/card relative flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase self-start">
              {article.source}
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded">
              {article.year}
            </span>
            {hasGrounding && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Grounded
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${sentimentColors[article.userReviews.sentiment]}`}>
            {article.userReviews.sentiment} Reception
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Your Rating</span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="ml-2 text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              title="Delete this paper from your library"
            >
              🗑 Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="10"
              value={article.rating}
              onChange={(e) => onUpdate(article.id, { rating: parseInt(e.target.value) })}
              className="w-12 text-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all py-1"
            />
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>
      </div>

      <h3 onClick={onRead} className="text-lg font-bold text-slate-100 leading-tight mb-1 cursor-pointer hover:text-indigo-400 transition-colors">
        {article.title}
      </h3>
      <p className="text-xs text-slate-400 mb-3">{article.authors.join(', ')}</p>

      {/* Grounding Source Preview */}
      {hasGrounding && (
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
           {article.groundingSources!.slice(0, 2).map((s, i) => s.web && (
             <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="shrink-0 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[9px] text-indigo-400 hover:border-indigo-500 transition-all flex items-center gap-1">
                <span>🔗</span> {s.web.title?.substring(0, 15)}...
             </a>
           ))}
        </div>
      )}

      {matchedInterests.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {matchedInterests.map(topic => (
            <span key={topic} className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 flex items-center gap-1.5">
              🎯 {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Scholar Impact</span>
          <div className="flex items-center gap-1.5 mt-0.5">
             <span className="text-sm font-bold text-indigo-400">
               {article.userReviews.citationCount?.toLocaleString() || '---'}
             </span>
             <span className="text-[10px] text-slate-500">citations</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto relative">
        <div className="flex gap-2">
          <button 
            onClick={() => setShowShelfMenu(!showShelfMenu)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-indigo-400"
            title="Manage Shelves"
          >
            Manage Shelves 📂
          </button>
          <button 
            onClick={onRead}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
          >
            📖 Open Reader
          </button>
        </div>

        {showShelfMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom">
            <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Literature Shelves</div>
            {shelves.map(shelf => (
              <button
                key={shelf.id}
                onClick={() => {
                  const currentShelves = article.shelfIds || [];
                  const isCurrentlyIn = currentShelves.includes(shelf.id);
                  onUpdate(article.id, { shelfIds: isCurrentlyIn ? currentShelves.filter(id => id !== shelf.id) : [...currentShelves, shelf.id] });
                }}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }}></div>
                   <span className="text-xs text-slate-200">{shelf.name}</span>
                </div>
                {article.shelfIds?.includes(shelf.id) && <span className="text-indigo-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-40 rounded-xl">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-sm w-full space-y-3">
              <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest">Delete Paper</h4>
              <p className="text-xs text-slate-300">
                Remove <span className="font-semibold text-slate-100">"{article.title}"</span> from your Scientific Library?
                Notes will remain, but this paper will disappear from all shelves and the queue.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    dbService.deleteArticle(article.id);
                    setShowDeleteConfirm(false);
                    // Notify listeners so LibrarySection/App refreshes from dbService
                    window.dispatchEvent(new CustomEvent('db-update'));
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;
