
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { FeedSourceType, Article, Book } from '../types';

interface TrendingSectionProps {
  interests: string[];
  onAdd: (article: Article) => void;
  onRead: (article: Article) => void;
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ interests, onAdd, onRead }) => {
  const [mode, setMode] = useState<'papers' | 'amazon'>('papers');
  const [timeScale, setTimeScale] = useState('6 months');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(interests.slice(0, 3));
  const [trending, setTrending] = useState<any[]>([]);
  const [amazonBooks, setAmazonBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const topicsToSearch = selectedTopics.length > 0 ? selectedTopics : interests;
    
    if (mode === 'papers') {
      const results = await geminiService.getTrendingResearch(topicsToSearch, timeScale);
      setTrending(results);
    } else {
      const results = await geminiService.searchAmazonBooks(topicsToSearch);
      setAmazonBooks(results);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeScale, mode]);

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

  const handleQueueBook = (book: any) => {
    const newBook: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: book.title,
      author: book.author,
      rating: book.rating || 0,
      dateAdded: new Date().toISOString(),
      price: book.price,
      amazonUrl: book.amazonUrl,
      isInQueue: true,
      description: book.description,
      tags: selectedTopics.slice(0, 2)
    };
    dbService.addBooks([newBook]);
    alert("Book added to library and marked in queue!");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span className={mode === 'papers' ? 'text-orange-500' : 'text-amber-500'}>
              {mode === 'papers' ? '🔥' : '🛒'}
            </span> 
            {mode === 'papers' ? 'Global Academic Trends' : 'Scientific Marketplace'}
          </h2>
          <p className="text-slate-400 mt-2">
            {mode === 'papers' 
              ? "Research papers currently seeing significant growth in discussion and citations."
              : "Top-rated scientific monographs and professional technical literature on Amazon."}
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
             <button 
               onClick={() => setMode('papers')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 mode === 'papers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               Research Papers
             </button>
             <button 
               onClick={() => setMode('amazon')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 mode === 'amazon' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               Amazon Books
             </button>
          </div>

          {mode === 'papers' && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
              <label className="text-[10px] uppercase font-bold text-slate-500">Time Scale</label>
              <select 
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-1 rounded-lg outline-none"
              >
                <option value="1 month">1M</option>
                <option value="3 months">3M</option>
                <option value="6 months">6M</option>
                <option value="12 months">1Y</option>
              </select>
            </div>
          )}
          
          <button 
            onClick={fetchData}
            disabled={loading}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 ${
              mode === 'papers' ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {loading ? 'Discovering...' : 'Refresh Discovery'}
          </button>
        </div>
      </header>

      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
        <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 px-1">Active Filter Channels</h3>
        <div className="flex flex-wrap gap-2">
          {interests.map(topic => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedTopics.includes(topic)
                  ? (mode === 'papers' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-amber-600 border-amber-500 text-white shadow-lg')
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className={`w-12 h-12 border-4 rounded-full animate-spin ${mode === 'papers' ? 'border-indigo-500/20 border-t-indigo-500' : 'border-amber-500/20 border-t-amber-500'}`}></div>
          <p className="text-slate-500 font-medium animate-pulse">Gemini is researching {mode === 'papers' ? 'breakthroughs' : 'market trends'}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mode === 'papers' ? (
            trending.map((paper, idx) => (
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
                <h3 onClick={() => onRead(createPaperObject(paper))} className="text-xl font-bold text-slate-100 mb-2 leading-snug group-hover:text-indigo-400 transition-colors cursor-pointer">{paper.title}</h3>
                <p className="text-xs text-slate-500 mb-4">{paper.authors.join(', ')}</p>
                <p className="text-sm text-slate-400 mb-6 line-clamp-3 italic">"{paper.snippet}"</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-indigo-400">{paper.citationCount?.toLocaleString()}</span><span className="text-[9px] uppercase font-bold text-slate-600 tracking-widest">Citations</span></div>
                    {paper.scholarUrl && <a href={paper.scholarUrl} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-white underline underline-offset-4 decoration-indigo-500/50">Scholar View</a>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onAdd(createPaperObject(paper, true))} className="bg-slate-800 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">⏳ Queue</button>
                    <button onClick={() => onAdd(createPaperObject(paper))} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">📥 Ingest</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            amazonBooks.map((book, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 border-l-4 border-l-amber-500/50 hover:border-amber-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-1 rounded">MARKET PICK</span>
                    <span className="text-amber-500 text-[10px] font-bold">★ {book.rating}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">{book.price || '---'}</div>
                    <div className="text-[9px] uppercase font-bold text-slate-600 tracking-tighter">Market Price</div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-1 leading-snug group-hover:text-amber-400 transition-colors">{book.title}</h3>
                <p className="text-xs text-slate-500 mb-4">by {book.author}</p>
                <p className="text-sm text-slate-400 mb-6 line-clamp-3 italic">"{book.description}"</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                  <a href={book.amazonUrl} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1">
                    <span>🛒</span> View on Amazon
                  </a>
                  <button 
                    onClick={() => handleQueueBook(book)} 
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20"
                  >
                    <span>⏳</span> Queue Book
                  </button>
                </div>
              </div>
            ))
          )}
          
          {(mode === 'papers' ? trending : amazonBooks).length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
              <p className="text-slate-500 italic">No recommendations found for these topics. Try expanding your search trajectories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendingSection;
