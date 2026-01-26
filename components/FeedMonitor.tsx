
import React, { useState, useEffect } from 'react';
import { FeedSourceType, Article, Feed, AIConfig } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

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
  const [ranking, setRanking] = useState<{ index: number, matchedTopics: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickTakes, setQuickTakes] = useState<Record<string, string>>({});
  const [shelfMenuCandidateId, setShelfMenuCandidateId] = useState<string | null>(null);

  const shelves = dbService.getData().shelves;

  const handleRank = async () => {
    setLoading(true);
    const interests = dbService.getInterests();
    const results = await geminiService.recommendArticles(ratedArticles, books, candidates, interests, aiConfig);
    setRanking(results);
    
    // Background fetch QuickTakes for top 3
    const topIndices = results.slice(0, 3).map(r => r.index);
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
    ? ranking.map(r => ({ ...candidates[r.index], matchedTopics: r.matchedTopics })) 
    : candidates;

  const createArticleFromCandidate = (c: any, shelfIds: string[] = []): Article => ({
    id: Math.random().toString(36).substr(2, 9),
    title: c.title,
    authors: c.authors || ['Author Placeholder'],
    abstract: c.snippet || c.abstract,
    quickTake: quickTakes[c.id],
    date: `${c.year || '2025'}-01-01`,
    year: c.year || '2025',
    source: (c.source as FeedSourceType) || FeedSourceType.MANUAL,
    rating: 5,
    tags: ['Recommended', ...(c.matchedTopics || [])],
    isBookmarked: false,
    notes: '',
    noteIds: [] as string[],
    userReadTime: 0,
    pdfUrl: (c as any).pdfUrl,
    shelfIds: shelfIds,
    userReviews: {
      sentiment: 'Unknown',
      summary: 'Newly discovered in feed.',
      citationCount: c.citationCount || 0,
      citedByUrl: `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title)}`
    }
  });

  const handleAssignToShelfAndIngest = (c: any, shelfId: string) => {
    const article = createArticleFromCandidate(c, [shelfId]);
    onAdd(article);
    setShelfMenuCandidateId(null);
  };

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
                
                <div className="flex gap-2 relative">
                  <button onClick={() => onAdd(createArticleFromCandidate(c))} className="flex-1 bg-indigo-600 text-white text-[11px] font-black uppercase py-2 rounded-xl">📥 Ingest</button>
                  <button 
                    onClick={() => setShelfMenuCandidateId(shelfMenuCandidateId === c.id ? null : c.id)}
                    className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-400 border border-slate-700"
                  >
                    📂
                  </button>
                  <button onClick={() => onRead(createArticleFromCandidate(c))} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-400 border border-slate-700">📖</button>

                  {shelfMenuCandidateId === c.id && (
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom">
                      <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Assign & Ingest</div>
                      {shelves.map(shelf => (
                        <button
                          key={shelf.id}
                          onClick={() => handleAssignToShelfAndIngest(c, shelf.id)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-700 rounded-lg transition-colors group"
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shelf.color }}></div>
                          <span className="text-xs text-slate-200">{shelf.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
