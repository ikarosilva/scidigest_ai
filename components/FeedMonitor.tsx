
import React, { useState, useEffect } from 'react';
import { FeedSourceType, Article, Feed, AIConfig } from '../types';
import { geminiService } from '../services/geminiService';

interface FeedMonitorProps {
  ratedArticles: Article[];
  books: any[];
  onAdd: (article: Article) => void;
  onRead: (article: Article) => void;
  activeFeeds: Feed[];
  aiConfig: AIConfig;
}

const MOCK_NEW_PAPERS = [
  { id: 'm1', title: 'Advances in Modern Computing Architectures', year: '2025', citationCount: 5, snippet: 'Exploring next-generation processing units for large scale workloads...', source: FeedSourceType.HUGGINGFACE, pdfUrl: 'https://arxiv.org/pdf/2401.00001.pdf' },
  { id: 'm2', title: 'Statistical Methods in Clinical Trials', year: '2024', citationCount: 42, snippet: 'A review of robust statistical frameworks for evaluating new treatments...', source: FeedSourceType.NATURE },
  { id: 'm3', title: 'Understanding Neural Network Interpretability', year: '2024', citationCount: 120, snippet: 'Methods for visualizing and understanding complex model decisions...', source: FeedSourceType.GOOGLE_SCHOLAR },
  { id: 'm4', title: 'Large Language Models in Public Health', year: '2023', citationCount: 890, snippet: 'Using generative AI to track and predict community health outcomes...', source: FeedSourceType.ARXIV, pdfUrl: 'https://arxiv.org/pdf/2301.00001.pdf' },
];

const FeedMonitor: React.FC<FeedMonitorProps> = ({ ratedArticles, books, onAdd, onRead, activeFeeds, aiConfig }) => {
  const [candidates, setCandidates] = useState(MOCK_NEW_PAPERS);
  const [ranking, setRanking] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleRank = async () => {
    setLoading(true);
    const indices = await geminiService.recommendArticles(ratedArticles, books, candidates, aiConfig);
    setRanking(indices);
    setLoading(false);
  };

  const sortedCandidates = ranking.length > 0 
    ? ranking.map(idx => candidates[idx]) 
    : candidates;

  const createArticleFromCandidate = (c: any, inQueue = false): Article => ({
    id: Math.random().toString(),
    title: c.title,
    authors: ['Author Placeholder'],
    abstract: c.snippet,
    date: `${c.year}-01-01`,
    year: c.year,
    source: c.source as FeedSourceType,
    rating: 5,
    tags: ['New'],
    isBookmarked: false,
    notes: '',
    noteIds: [] as string[],
    userReadTime: 0,
    pdfUrl: (c as any).pdfUrl,
    // Fix: replaced deprecated isInQueue and queueDate with shelfIds
    shelfIds: inQueue ? ['default-queue'] : [],
    userReviews: {
      sentiment: 'Unknown',
      summary: 'Newly discovered in feed.',
      citationCount: c.citationCount,
      citedByUrl: `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title)}`
    }
  });

  return (
    <div className="space-y-6 relative">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
             <span>✨</span> AI Recommends
          </h2>
          <p className="text-slate-400">Research prioritized from your {activeFeeds.length} active sources.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="text-slate-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-800 hover:border-indigo-500/20 transition-all"
          >
            ❓ How it Works
          </button>
          <button 
            onClick={handleRank}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'AI Ranking...' : '🪄 Rank with AI'}
          </button>
        </div>
      </header>

      {/* How it Works Modal/Overlay */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-100">AI Recommendation Engine</h3>
                <p className="text-slate-400 text-sm mt-1">Human-in-the-Loop Reinforcement Learning Methodology</p>
              </div>
              <button onClick={() => setShowHowItWorks(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] pr-2">
              <div className="space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <span>📊</span> 1. Data Aggregation
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Gemini aggregates three signals: your explicit 8-10/10 article ratings, your defined research topics, and theoretical context from your imported scientific books.
                  </p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <span>🧠</span> 2. Semantic Analysis
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Using <span className="text-slate-200">Gemini 3 Flash</span>, the engine performs semantic matching. It understands conceptual overlaps (e.g., Transformers vs. Attention) even when keywords don't match.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <span>⚖️</span> 3. Discovery Bias
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your settings determine the search scope. <strong>Conservative</strong> sticks to known interests; <strong>Exploratory</strong> seeks breakthroughs at the intersection of your fields.
                  </p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <span>🔄</span> 4. RLHF Feedback Loop
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Every time you <strong>Ingest</strong> or rate a paper, the model's priority weights are updated locally, refining future recommendations in a continuous learning loop.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHowItWorks(false)}
              className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700 transition-all"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {activeFeeds.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-16 text-center">
           <span className="text-5xl block mb-4">📭</span>
           <h3 className="text-xl font-bold text-slate-300">No Active Feeds</h3>
           <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">You have disabled all feed sources. Configure them in Settings to start discovering new research.</p>
           <button className="text-indigo-400 font-bold hover:underline">Go to Settings →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCandidates.map((c, i) => (
            <div key={c.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 relative group overflow-hidden transition-all hover:border-indigo-500/50 flex flex-col">
              {ranking.length > 0 && i < 3 && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-tighter shadow-md">
                  Highly Recommended
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                 <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{c.source}</span>
                 <span className="text-[10px] text-slate-500 font-bold">{c.year}</span>
              </div>
              <h3 
                onClick={() => onRead(createArticleFromCandidate(c))}
                className="text-lg font-bold text-slate-100 mt-1 mb-2 leading-tight cursor-pointer hover:text-indigo-400 transition-colors"
              >
                {c.title}
              </h3>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Est. Citations:</span>
                <span className="text-[11px] font-bold text-indigo-300">{c.citationCount.toLocaleString()}</span>
              </div>

              <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-4 italic">"{c.snippet}"</p>
              
              <div className="flex gap-2">
                <div className="relative group/tooltip flex-1">
                  <button 
                    onClick={() => onAdd(createArticleFromCandidate(c))}
                    className="w-full bg-indigo-600 border border-transparent text-white text-[11px] font-black uppercase py-2 rounded-xl transition-all hover:bg-indigo-700"
                  >
                    📥 Ingest
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-[10px] text-slate-200 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-slate-700 shadow-xl">
                    Add this article to your permanent library
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onAdd(createArticleFromCandidate(c, true))}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl hover:text-amber-400 hover:border-amber-500/30 transition-all text-xs"
                  title="Add to Reading Queue"
                >
                  ⏳
                </button>

                <button 
                  onClick={() => onRead(createArticleFromCandidate(c))}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                  title="Quick Read"
                >
                  📖
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedMonitor;
