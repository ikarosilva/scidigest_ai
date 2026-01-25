
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
  const [candidates, setCandidates] = useState<any[]>(MOCK_NEW_PAPERS);
  const [ranking, setRanking] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [quickTakes, setQuickTakes] = useState<Record<string, string>>({});

  const handleRank = async () => {
    setLoading(true);
    const indices = await geminiService.recommendArticles(ratedArticles, books, candidates, aiConfig);
    setRanking(indices);
    
    // Background fetch QuickTakes for top 3
    const topIndices = indices.slice(0, 3);
    for (const idx of topIndices) {
      const c = candidates[idx];
      if (!quickTakes[c.id]) {
        geminiService.generateQuickTake(c.title, c.snippet).then(take => {
          setQuickTakes(prev => ({ ...prev, [c.id]: take }));
        });
      }
    }
    setLoading(false);
  };

  const sortedCandidates = ranking.length > 0 
    ? ranking.map(idx => candidates[idx]) 
    : candidates;

  const createArticleFromCandidate = (c: any, inQueue = false): Article => ({
    id: Math.random().toString(),
    title: c.title,
    authors: c.authors || ['Author Placeholder'],
    abstract: c.snippet || c.abstract,
    quickTake: quickTakes[c.id],
    date: `${c.year || '2025'}-01-01`,
    year: c.year || '2025',
    source: (c.source as FeedSourceType) || FeedSourceType.MANUAL,
    rating: 5,
    tags: ['Recommended'],
    isBookmarked: false,
    notes: '',
    noteIds: [] as string[],
    userReadTime: 0,
    pdfUrl: (c as any).pdfUrl,
    shelfIds: inQueue ? ['default-queue'] : [],
    userReviews: {
      sentiment: 'Unknown',
      summary: 'Newly discovered in feed.',
      citationCount: c.citationCount || 0,
      citedByUrl: `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title)}`
    }
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <section className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <span>✨</span> AI Discovery
            </h2>
            <p className="text-slate-400">Broad research prioritization from your {activeFeeds.length} active sources.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRank}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {loading ? 'Ranking...' : '🪄 Ingest & Rank'}
            </button>
          </div>
        </header>

        {activeFeeds.length === 0 ? (
          <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-16 text-center">
             <h3 className="text-xl font-bold text-slate-300">No Active Feeds</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCandidates.map((c, i) => (
              <div key={c.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 relative group overflow-hidden transition-all hover:border-indigo-500/50 flex flex-col">
                {ranking.length > 0 && i < 3 && (
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-md">
                    Targeted Hit
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
                
                {quickTakes[c.id] && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl mb-4 animate-in slide-in-from-top-2">
                     <p className="text-[10px] font-bold text-indigo-300 flex items-start gap-2">
                        <span className="shrink-0">⚡</span>
                        <span>{quickTakes[c.id]}</span>
                     </p>
                  </div>
                )}

                <p className="text-sm text-slate-400 mb-6 flex-1 line-clamp-4 italic">"{c.snippet}"</p>
                
                <div className="flex gap-2">
                  <button onClick={() => onAdd(createArticleFromCandidate(c))} className="flex-1 bg-indigo-600 text-white text-[11px] font-black uppercase py-2 rounded-xl">📥 Ingest</button>
                  <button onClick={() => onRead(createArticleFromCandidate(c))} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-400">📖</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FeedMonitor;
