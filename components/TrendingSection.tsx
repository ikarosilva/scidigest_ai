
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { FeedSourceType, Article } from '../types';

interface TrendingSectionProps {
  interests: string[];
  onAdd: (article: Article) => void;
  onRead: (article: Article) => void;
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ interests, onAdd, onRead }) => {
  const [timeScale, setTimeScale] = useState('6 months');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(interests.slice(0, 3));
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = async () => {
    setLoading(true);
    const topicsToSearch = selectedTopics.length > 0 ? selectedTopics : interests;
    const results = await geminiService.getTrendingResearch(topicsToSearch, timeScale);
    setTrending(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrending();
  }, [timeScale]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const createPaperObject = (paper: any, inQueue = false): Article => ({
    id: Math.random().toString(36).substr(2, 9),
    title: paper.title,
    authors: paper.authors,
    abstract: paper.snippet,
    date: `${paper.year}-01-01`,
    year: paper.year,
    source: (paper.source as any) || FeedSourceType.MANUAL,
    rating: 5,
    tags: ['Trending', ...selectedTopics.slice(0, 2)],
    isBookmarked: false,
    notes: `Added from trending research (Heat: ${paper.heatScore}%)`,
    userReadTime: 0,
    isInQueue: inQueue,
    queueDate: inQueue ? new Date().toISOString() : undefined,
    userReviews: {
      sentiment: 'Unknown',
      summary: 'Highly trending topic in community.',
      citationCount: paper.citationCount,
      citedByUrl: paper.scholarUrl
    },
    noteIds: [] as string[]
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-orange-500">🔥</span> Global Academic Trends
          </h2>
          <p className="text-slate-400 mt-2">
            Research papers currently seeing significant growth in discussion and citations across your fields.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-2">Time Scale</label>
          <select 
            value={timeScale}
            onChange={(e) => setTimeScale(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="1 month">Last Month</option>
            <option value="3 months">Last 3 Months</option>
            <option value="6 months">Last 6 Months</option>
            <option value="12 months">Last Year</option>
          </select>
          <button 
            onClick={fetchTrending}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
        <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 px-1">Filter by Your Topics</h3>
        <div className="flex flex-wrap gap-2">
          {interests.map(topic => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedTopics.includes(topic)
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {topic}
            </button>
          ))}
          {interests.length === 0 && <p className="text-xs text-slate-600 italic px-1">Configure topics in the side menu.</p>}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Gemini is searching for breakthrough research...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trending.map((paper, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-1 rounded">TRENDING #{idx + 1}</span>
                    <span className="text-slate-500 text-[10px] font-bold">{paper.year} • {paper.source}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-indigo-400">{paper.heatScore}%</div>
                  <div className="text-[9px] uppercase font-bold text-slate-600 tracking-tighter">Heat Score</div>
                </div>
              </div>

              <h3 
                onClick={() => onRead(createPaperObject(paper))}
                className="text-xl font-bold text-slate-100 mb-2 leading-snug group-hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {paper.title}
              </h3>
              <p className="text-xs text-slate-500 mb-4">{paper.authors.join(', ')}</p>
              
              <p className="text-sm text-slate-400 mb-6 line-clamp-3 italic">
                "{paper.snippet}"
              </p>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-indigo-400">{paper.citationCount?.toLocaleString()}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-600 tracking-widest">Citations</span>
                  </div>
                  {paper.scholarUrl && (
                    <a href={paper.scholarUrl} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-white underline underline-offset-4 decoration-indigo-500/50">
                      Scholar View
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onAdd(createPaperObject(paper, true))}
                    className="bg-slate-800 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                    title="Add to Reading Queue"
                  >
                    ⏳ Queue
                  </button>
                  <button 
                    onClick={() => onAdd(createPaperObject(paper))}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    📥 Ingest
                  </button>
                </div>
              </div>
            </div>
          ))}
          {trending.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
              <p className="text-slate-500 italic">No trending papers found for these topics. Try expanding your search or refreshing.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendingSection;
