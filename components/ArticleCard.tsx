
import React, { useState } from 'react';
import { Article, Sentiment, Note } from '../types';
import { geminiService } from '../services/geminiService';

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
  const [researching, setResearching] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    const result = await geminiService.summarizeArticle(article.title, article.abstract);
    setSummary(result);
    setLoading(false);
  };

  const handleUpdateReviews = async () => {
    setResearching(true);
    const result = await geminiService.analyzeSentiment(article);
    onUpdate(article.id, { userReviews: result });
    setResearching(false);
  };

  const sentimentColors: Record<Sentiment, string> = {
    Positive: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Negative: 'bg-red-500/20 text-red-400 border-red-500/30',
    Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  const linkedNotes = allNotes.filter(n => article.noteIds.includes(n.id));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-indigo-500/5 transition-all group/card">
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
      
      {/* Linked Notes Section */}
      {linkedNotes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block w-full mb-1">Linked Notes</span>
          {linkedNotes.map(note => (
            <button 
              key={note.id}
              onClick={() => onNavigateToNote(note.id)}
              className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/30 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded transition-all flex items-center gap-1"
            >
              <span>✍️</span> {note.title}
            </button>
          ))}
        </div>
      )}

      {/* Metrics Row */}
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
        {article.userReviews.citedByUrl && (
          <a href={article.userReviews.citedByUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-400 underline font-medium self-end mb-0.5">
            Google Scholar →
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {article.tags.map(tag => (
          <span key={tag} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
            #{tag}
          </span>
        ))}
      </div>

      <div className="mb-4 space-y-3">
        {summary && (
          <div className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 border-l-4 border-indigo-500 whitespace-pre-line">
            <strong className="text-indigo-400">AI Summary:</strong><br/>
            {summary}
          </div>
        )}

        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Community Sentiment</span>
            <button 
              onClick={handleUpdateReviews} 
              disabled={researching}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              {researching ? '🔄 Researching Impact...' : '🔍 Update Stats'}
            </button>
          </div>
          <p className="text-xs text-slate-300 italic">"{article.userReviews.summary}"</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleSummarize}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/10"
        >
          {loading ? 'Thinking...' : '⚡ Summarize'}
        </button>
        <button 
          onClick={onRead}
          className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <span className="text-xs">📖</span> Read
        </button>
      </div>
    </div>
  );
};

export default ArticleCard;
