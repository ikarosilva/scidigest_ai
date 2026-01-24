
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

  const handleRank = async () => {
    setLoading(true);
    const indices = await geminiService.recommendArticles(ratedArticles, books, candidates, aiConfig);
    setRanking(indices);
    setLoading(false);
  };

  const sortedCandidates = ranking.length > 0 
    ? ranking.map(idx => candidates[idx]) 
    : candidates;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
             <span>✨</span> AI Recommends
          </h2>
          <p className="text-slate-400">Research prioritized from your {activeFeeds.length} active sources.</p>
        </div>
        <button 
          onClick={handleRank}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          {loading ? 'AI Ranking...' : '🪄 Rank with AI'}
        </button>
      </header>

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
                onClick={() => onRead({
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
                   noteIds: [],
                   pdfUrl: (c as any).pdfUrl,
                   userReviews: { sentiment: 'Unknown', summary: '' }
                })}
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
                <button 
                  onClick={() => onAdd({
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
                    noteIds: [],
                    pdfUrl: (c as any).pdfUrl,
                    userReviews: {
                      sentiment: 'Unknown',
                      summary: 'Newly discovered in feed.',
                      citationCount: c.citationCount,
                      citedByUrl: `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title)}`
                    }
                  })}
                  className="flex-1 bg-indigo-600 border border-transparent text-white font-bold py-2 rounded-xl transition-all hover:bg-indigo-700"
                >
                  📥 Ingest
                </button>
                <button 
                  onClick={() => onRead({
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
                    noteIds: [],
                    pdfUrl: (c as any).pdfUrl,
                    userReviews: { sentiment: 'Unknown', summary: '' }
                  })}
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
