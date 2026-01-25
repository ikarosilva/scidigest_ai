
import React, { useState, useMemo } from 'react';
import { Article } from '../types';
import { geminiService } from '../services/geminiService';

interface SprintSectionProps {
  articles: Article[];
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onRead: (article: Article) => void;
}

const SprintSection: React.FC<SprintSectionProps> = ({ articles, onUpdateArticle, onRead }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingTake, setLoadingTake] = useState(false);

  // Focus on unrated papers to triage
  const sprintItems = useMemo(() => {
    return articles.filter(a => a.rating === 0).slice(0, 15);
  }, [articles]);

  const currentArticle = sprintItems[currentIndex];

  const handleGenerateTake = async () => {
    if (!currentArticle || currentArticle.quickTake) return;
    setLoadingTake(true);
    try {
      const take = await geminiService.generateQuickTake(currentArticle.title, currentArticle.abstract);
      onUpdateArticle(currentArticle.id, { quickTake: take });
    } catch (err) {
      console.error("Sprint QuickTake Error:", err);
    } finally {
      setLoadingTake(false);
    }
  };

  const handleAction = (action: 'keep' | 'queue' | 'dismiss') => {
    if (!currentArticle) return;
    
    if (action === 'queue') {
      onUpdateArticle(currentArticle.id, { 
        shelfIds: [...new Set([...currentArticle.shelfIds, 'default-queue'])],
        rating: 1 // Move from 0 to 1 to mark as "seen"
      });
    } else if (action === 'dismiss') {
      onUpdateArticle(currentArticle.id, { rating: -1 }); // Special rating for dismissed
    } else {
      onUpdateArticle(currentArticle.id, { rating: 5 }); // Default rating for library
    }

    if (currentIndex < sprintItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!currentArticle) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 opacity-50">
        <span className="text-6xl mb-6">🏁</span>
        <h3 className="text-2xl font-bold text-white">Sprint Complete</h3>
        <p className="text-slate-400 max-w-sm mt-2">You've triaged all pending papers. Your research radar is clear.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>🏃</span> Research Sprint
          </h2>
          <p className="text-slate-400 mt-1">Rapid triage of incoming scientific findings.</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-bold text-indigo-400">
          {currentIndex + 1} / {sprintItems.length}
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center text-center">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-800">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
            style={{ width: `${((currentIndex + 1) / sprintItems.length) * 100}%` }}
          ></div>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center gap-3">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest px-3 py-1 rounded-full">{currentArticle.source}</span>
            <span className="text-[10px] bg-slate-800 text-slate-500 font-bold px-3 py-1 rounded-full">{currentArticle.year}</span>
          </div>

          <h3 className="text-3xl font-black text-white leading-tight px-4">{currentArticle.title}</h3>
          <p className="text-slate-500 text-sm font-medium">{currentArticle.authors.join(', ')}</p>

          <div className="bg-indigo-950/20 border border-indigo-500/20 p-8 rounded-[2rem] min-h-[140px] flex items-center justify-center relative">
            {currentArticle.quickTake ? (
              <p className="text-xl font-serif italic text-indigo-200 leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                "{currentArticle.quickTake}"
              </p>
            ) : (
              <button 
                onClick={handleGenerateTake}
                disabled={loadingTake}
                className="text-indigo-400 hover:text-white flex flex-col items-center gap-2 group transition-all"
              >
                <span className={`text-4xl ${loadingTake ? 'animate-spin opacity-50' : 'group-hover:scale-110'}`}>⚡</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{loadingTake ? 'Analyzing Contribution...' : 'Generate Quick Take'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 flex gap-6 justify-center">
          <button 
            onClick={() => handleAction('dismiss')}
            className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/10 active:scale-90"
            title="Dismiss / Out of Scope"
          >
            ✕
          </button>
          <button 
            onClick={() => handleAction('keep')}
            className="w-20 h-20 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center text-3xl hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95"
            title="Keep in Library"
          >
            📥
          </button>
          <button 
            onClick={() => handleAction('queue')}
            className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/10 active:scale-90"
            title="Add to Daily Reading Queue"
          >
            ⏳
          </button>
        </div>
        
        <button 
          onClick={() => onRead(currentArticle)}
          className="mt-10 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-indigo-400 transition-colors"
        >
          Open Deep Reader →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
           <p className="text-xs font-bold text-slate-300">Triage Speed</p>
           <p className="text-[10px] text-slate-500 leading-tight">Identify relevance in &lt; 10s using AI Takes.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
           <p className="text-xs font-bold text-slate-300">Cognitive Focus</p>
           <p className="text-[10px] text-slate-500 leading-tight">One paper at a time. Zero distractions.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
           <p className="text-xs font-bold text-slate-300">Daily Goal</p>
           <p className="text-[10px] text-slate-500 leading-tight">Reach Inbox Zero on your discovery feeds.</p>
        </div>
      </div>
    </div>
  );
};

export default SprintSection;
