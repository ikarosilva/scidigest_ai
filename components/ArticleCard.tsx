
import React, { useState } from 'react';
import { Article, Sentiment, Note, Shelf } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface ArticleCardProps {
  article: Article;
  allNotes: Note[];
  onUpdate: (id: string, updates: Partial<Article>) => void;
  onNavigateToNote: (noteId: string) => void;
  onRead: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, allNotes, onUpdate, onNavigateToNote, onRead }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showShelfMenu, setShowShelfMenu] = useState(false);

  const shelves = dbService.getData().shelves;

  const handleSummarize = async () => {
    setLoading(true);
    const result = await geminiService.summarizeArticle(article.title, article.abstract);
    setSummary(result || null);
    setLoading(false);
  };

  const handleDeepResearch = () => {
    const query = encodeURIComponent(`Find recent citations, related clinical trials, and critical reviews of the paper: "${article.title}" by ${article.authors.join(', ')}. Specifically check for updates since ${article.year}.`);
    window.open(`https://www.perplexity.ai/search?q=${query}`, '_blank');
  };

  const toggleShelf = (shelfId: string) => {
    const isCurrentlyIn = article.shelfIds?.includes(shelfId);
    let newShelfIds = article.shelfIds || [];
    if (isCurrentlyIn) {
      newShelfIds = newShelfIds.filter(id => id !== shelfId);
    } else {
      newShelfIds = [...newShelfIds, shelfId];
    }
    onUpdate(article.id, { shelfIds: newShelfIds });
  };

  const sentimentColors: Record<Sentiment, string> = {
    Positive: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Negative: 'bg-red-500/20 text-red-400 border-red-500/30',
    Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-indigo-500/5 transition-all group/card relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase self-start">
              {article.source}
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded">
              {article.year}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${sentimentColors[article.userReviews.sentiment]}`}>
            {article.userReviews.sentiment} Reception
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Your Rating</span>
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

      <h3 
        onClick={onRead}
        className="text-lg font-bold text-slate-100 leading-tight mb-1 cursor-pointer hover:text-indigo-400 transition-colors"
      >
        {article.title}
      </h3>
      <p className="text-xs text-slate-400 mb-3">{article.authors.join(', ')}</p>
      
      {article.shelfIds?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
           {article.shelfIds.map(sid => {
             const s = shelves.find(sh => sh.id === sid);
             return s ? (
               <span key={sid} className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-slate-700/50 text-slate-500 flex items-center gap-1.5 bg-slate-950/50">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                  {s.name}
               </span>
             ) : null;
           })}
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
        <button 
          onClick={handleDeepResearch}
          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold ml-auto flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10 transition-all"
        >
          <span>🌐</span> Perplexity Deep Research
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {article.tags.map((tag: string) => (
          <span key={tag} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
            #{tag}
          </span>
        ))}
      </div>

      {summary && (
        <div className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 border-l-4 border-indigo-500 whitespace-pre-line mb-4 animate-in fade-in slide-in-from-left-2">
          <strong className="text-indigo-400">AI Summary:</strong><br/>
          {summary}
        </div>
      )}

      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <button 
            onClick={() => setShowShelfMenu(!showShelfMenu)}
            className={`w-full text-xs font-bold py-2 rounded-lg transition-all border flex items-center justify-center gap-2 ${
              article.shelfIds?.length > 0 
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20' 
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-indigo-400 hover:border-indigo-500/30'
            }`}
          >
            {article.shelfIds?.length > 0 ? `📂 On ${article.shelfIds.length} Shelves` : '📥 Add to Shelf'}
          </button>
          
          {showShelfMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom-left">
              <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Select Shelves</div>
              {shelves.map(shelf => (
                <button
                  key={shelf.id}
                  onClick={() => toggleShelf(shelf.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }}></div>
                     <span className="text-xs text-slate-200">{shelf.name}</span>
                  </div>
                  {article.shelfIds?.includes(shelf.id) && (
                    <span className="text-indigo-400 text-xs">✓</span>
                  )}
                </button>
              ))}
              <div className="p-1 mt-1 border-t border-slate-700">
                <button 
                  onClick={() => setShowShelfMenu(false)}
                  className="w-full text-[10px] text-slate-500 hover:text-white py-1 transition-colors"
                >
                  Close Menu
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleSummarize}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/10"
        >
          {loading ? 'Thinking...' : '⚡ AI Summary'}
        </button>
        <button 
          onClick={onRead}
          className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <span className="text-xs">📖</span>
        </button>
      </div>
    </div>
  );
};

export default ArticleCard;
