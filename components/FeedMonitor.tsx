import React, { useState, useMemo } from 'react';
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
  { id: 'm1', title: 'Advances in Modern Computing Architectures', year: '2025', citationCount: 5, snippet: 'Exploring next-generation processing units for large scale workloads using heterogeneous computing models...', source: FeedSourceType.HUGGINGFACE, pdfUrl: 'https://arxiv.org/pdf/2401.00001.pdf' },
  { id: 'm2', title: 'Statistical Methods in Clinical Trials', year: '2024', citationCount: 42, snippet: 'A review of robust statistical frameworks for evaluating new treatments in complex patient populations...', source: FeedSourceType.NATURE },
  { id: 'm3', title: 'Understanding Neural Network Interpretability', year: '2024', citationCount: 120, snippet: 'Methods for visualizing and understanding complex model decisions through attention maps and gradients...', source: FeedSourceType.GOOGLE_SCHOLAR },
  { id: 'm4', title: 'Large Language Models in Public Health', year: '2023', citationCount: 890, snippet: 'Using generative AI to track and predict community health outcomes using real-world clinical datasets...', source: FeedSourceType.ARXIV, pdfUrl: 'https://arxiv.org/pdf/2301.00001.pdf' },
];

const FeedMonitor: React.FC<FeedMonitorProps> = ({ ratedArticles, books, onAdd, onRead, activeFeeds, aiConfig }) => {
  const [candidates] = useState<any[]>(MOCK_NEW_PAPERS);
  const [ranking, setRanking] = useState<{ index: number, matchedTopics: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickTakes, setQuickTakes] = useState<Record<string, string>>({});

  const interests = dbService.getInterests();

  // Local Topic Matcher - ensures articles are tagged even before Gemini Ranking
  const getLocalMatchedTopics = (title: string, snippet: string) => {
    const text = (title + ' ' + snippet).toLowerCase();
    return interests.filter(interest => 
      text.includes(interest.toLowerCase()) || 
      interest.toLowerCase().split(' ').some(word => word.length > 3 && text.includes(word))
    );
  };

  const handleRank = async () => {
    setLoading(true);
    const results = await geminiService.recommendArticles(ratedArticles, books, candidates, interests, aiConfig);
    setRanking(results);
    
    // Background fetch QuickTakes for top candidates
    const topIndices = results.slice(0, 5).map(r => r.index);
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

  const sortedCandidates = useMemo(() => {
    if (ranking.length === 0) {
      // Show default candidates with local topic matching
      return candidates.map(c => ({ 
        ...c, 
        matchedTopics: getLocalMatchedTopics(c.title, c.snippet) 
      }));
    }
    return ranking.map(r => ({ 
      ...candidates[r.index], 
      matchedTopics: r.matchedTopics.length > 0 ? r.matchedTopics : getLocalMatchedTopics(candidates[r.index].title, candidates[r.index].snippet)
    }));
  }, [candidates, ranking, interests]);

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
              className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {loading ? 'Analyzing Trajectories...' : '🪄 Ingest & Rank'}
            </button>
          </div>
        </header>

        {activeFeeds.length === 0 ? (
          <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-16 text-center">
             <h3 className="text-xl font-bold text-slate-300">No Active Feeds</h3>
             <p className="text-slate-500 mt-2">Configure monitoring feeds in Sources & Topics to see recommendations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCandidates.map((c, i) => (
              <div 
                key={c.id} 
                onClick={() => onRead(createArticleFromCandidate(c))}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative group overflow-hidden transition-all hover:border-indigo-500/50 hover:bg-slate-800/50 flex flex-col cursor-pointer shadow-xl shadow-black/20"
              >
                {ranking.length > 0 && i < 3 && (
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-md z-10">
                    High Match
                  </div>
                )}
                
                {/* Meta Header: Source & Date */}
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/10">
                       {c.source}
                     </span>
                     <span className="text-[9px] text-slate-500 font-bold border border-slate-800 px-2 py-1 rounded-lg bg-slate-950/50">
                       {c.year}
                     </span>
                   </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-100 mb-3 leading-tight group-hover:text-indigo-400 transition-colors">
                  {c.title}
                </h3>
                
                {/* Sentence Description (QuickTake Fallback to Snippet) */}
                <div className="flex-1">
                  <div className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-xl mb-4 shadow-inner">
                     <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                        {quickTakes[c.id] ? `"${quickTakes[c.id]}"` : c.snippet}
                     </p>
                  </div>
                </div>

                {/* Matching Topics Section */}
                <div className="mb-6">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-2">Matching Trajectories</span>
                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {c.matchedTopics && c.matchedTopics.length > 0 ? (
                      c.matchedTopics.map((topic: string) => (
                        <span key={topic} className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          🎯 {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">No Direct Topic Matches</span>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex gap-2 pt-4 border-t border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => onAdd(createArticleFromCandidate(c, ['default-queue']))}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase py-2.5 rounded-xl border border-slate-700 transition-all active:scale-95"
                    title="Queue for Analysis"
                  >
                    <span>📂</span> Queue
                  </button>
                  
                  <button 
                    onClick={() => onAdd(createArticleFromCandidate(c))}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase py-2.5 rounded-xl border border-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    title="Add to Library"
                  >
                    <span>📚</span> Ingest
                  </button>

                  <button 
                    onClick={() => onRead(createArticleFromCandidate(c))}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-indigo-400 rounded-xl border border-slate-800 transition-all active:scale-95"
                    title="Launch Reader"
                  >
                    <span>📖</span>
                  </button>
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