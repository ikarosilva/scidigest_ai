
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
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [shelfMenuPaperId, setShelfMenuPaperId] = useState<string | null>(null);

  const shelves = dbService.getData().shelves;

  const fetchData = async () => {
    setLoading(true);
    const topicsToSearch = selectedTopics.length > 0 ? selectedTopics : interests;
    
    try {
      if (mode === 'papers') {
        const { results, groundingSources } = await geminiService.getTrendingResearch(topicsToSearch, timeScale);
        setTrending(results || []);
        setGroundingSources(groundingSources || []);
      } else {
        const { results, groundingSources } = await geminiService.searchAmazonBooks(topicsToSearch);
        setAmazonBooks(results || []);
        setGroundingSources(groundingSources || []);
      }
      setHasLoadedOnce(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeScale, mode]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const createPaperObject = (paper: any, shelfIds: string[] = []): Article => ({
    id: Math.random().toString(36).substr(2, 9),
    title: paper.title || 'Untitled Discovery',
    authors: paper.authors || ['Research Group'],
    abstract: paper.snippet || paper.description || 'No snippet available.',
    date: `${paper.year || '2025'}-01-01`,
    year: paper.year || '2025',
    source: (paper.source as any) || FeedSourceType.MANUAL,
    rating: 5,
    tags: ['Trending', ...selectedTopics.slice(0, 2)],
    isBookmarked: false,
    notes: `Added from trending research (Heat: ${paper.heatScore || 'N/A'}%)`,
    userReadTime: 0,
    shelfIds: shelfIds,
    userReviews: {
      sentiment: 'Unknown',
      summary: 'Highly trending topic in community.',
      citationCount: paper.citationCount || 0,
      citedByUrl: paper.scholarUrl
    },
    noteIds: [] as string[]
  });

  const handleQueueBook = (book: any) => {
    const newBook: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: book.title || 'Untitled Book',
      author: book.author || 'Unknown',
      rating: parseFloat(book.rating) || 0,
      dateAdded: new Date().toISOString(),
      price: book.price,
      amazonUrl: book.amazonUrl,
      shelfIds: ['default-queue'],
      description: book.description,
      tags: selectedTopics.slice(0, 2)
    };
    dbService.addBooks([newBook]);
    alert("Book added to library and marked in queue!");
  };

  const handleAssignToShelfAndIngest = (paper: any, shelfId: string) => {
    const article = createPaperObject(paper, [shelfId]);
    onAdd(article);
    setShelfMenuPaperId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span className={mode === 'papers' ? 'text-orange-500' : 'text-amber-500'}>
              {mode === 'papers' ? '🔥' : '🛒'}
            </span> 
            {mode === 'papers' ? 'Global Trends' : 'Technical Marketplace'}
          </h2>
          <p className="text-slate-400 mt-2">
            {mode === 'papers' 
              ? "Crawl the global network for breakthroughs with high citation velocity."
              : "Discover highly-rated monographs and textbooks currently trending."}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
             <button 
               onClick={() => setMode('papers')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 mode === 'papers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               Papers
             </button>
             <button 
               onClick={() => setMode('amazon')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 mode === 'amazon' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               Books
             </button>
          </div>
          
          <button 
            onClick={fetchData}
            disabled={loading}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 ${
              mode === 'papers' ? 'bg-indigo-600' : 'bg-amber-600'
            } text-white`}
          >
            {loading ? 'Discovering...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Grounding Sources Panel (Mandatory) */}
      {groundingSources.length > 0 && (
        <div className="bg-slate-950 border border-indigo-500/20 p-4 rounded-2xl animate-in slide-in-from-top-2">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
             Search Grounding Verification
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {groundingSources.map((s, i) => s.web && (
              <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                <span>🔗</span> {s.web.title || s.web.uri}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
        <h3 className="text-[9px] uppercase font-black text-slate-600 tracking-widest mb-3">Topic Filters</h3>
        <div className="flex flex-wrap gap-2">
          {interests.map(topic => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${
                selectedTopics.includes(topic)
                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className={`w-10 h-10 border-2 rounded-full animate-spin ${mode === 'papers' ? 'border-indigo-500/20 border-t-indigo-500' : 'border-amber-500/20 border-t-amber-500'}`}></div>
          <p className="text-slate-600 text-xs font-medium animate-pulse">Synthesizing current {mode === 'papers' ? 'breakthroughs' : 'market trends'}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(mode === 'papers' ? trending : amazonBooks).map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/20 transition-all flex flex-col relative">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${mode === 'papers' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {mode === 'papers' ? `Impact Rank #${idx + 1}` : `Market Pick #${idx + 1}`}
                </span>
                <span className="text-[10px] text-slate-600 font-bold">{item.year || '★ ' + (item.rating || 'N/A')}</span>
              </div>
              <h3 onClick={() => mode === 'papers' && onRead(createPaperObject(item))} className={`text-md font-bold text-slate-100 mb-2 leading-tight ${mode === 'papers' ? 'cursor-pointer hover:text-indigo-400 transition-colors' : ''}`}>{item.title || 'Untitled Entry'}</h3>
              <p className="text-[10px] text-slate-500 mb-4">{mode === 'papers' ? (item.authors?.join(', ') || 'Various Authors') : 'by ' + (item.author || 'Unknown')}</p>
              <p className="text-xs text-slate-400 mb-6 line-clamp-3 italic leading-relaxed">"{item.snippet || item.description || 'No description provided by search grounded model.'}"</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-4">
                  {mode === 'papers' ? (
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-indigo-400">{item.citationCount?.toLocaleString() || '---'}</span><span className="text-[9px] font-black text-slate-600 uppercase">Citations</span></div>
                  ) : (
                    <span className="text-xs font-black text-emerald-400">{item.price || '---'}</span>
                  )}
                </div>
                <div className="flex gap-2 relative">
                  <button onClick={() => mode === 'papers' ? onAdd(createPaperObject(item, ['default-queue'])) : handleQueueBook(item)} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all">Queue</button>
                  
                  {mode === 'papers' && (
                    <>
                      <button 
                        onClick={() => setShelfMenuPaperId(shelfMenuPaperId === item.title ? null : item.title)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold px-3 py-2 rounded-lg transition-all border border-slate-700"
                      >
                        📂
                      </button>
                      <button onClick={() => onAdd(createPaperObject(item))} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all">Ingest</button>
                    </>
                  )}

                  {shelfMenuPaperId === item.title && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom-right">
                      <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Assign & Ingest</div>
                      {shelves.map(shelf => (
                        <button
                          key={shelf.id}
                          onClick={() => handleAssignToShelfAndIngest(item, shelf.id)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-700 rounded-lg transition-colors text-left"
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shelf.color }}></div>
                          <span className="text-xs text-slate-200">{shelf.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {(mode === 'papers' ? trending : amazonBooks).length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
              <p className="text-slate-600 text-sm">No {mode === 'papers' ? 'papers' : 'books'} found for these trajectories. Try expanding your search filters or refreshing.</p>
              {!hasLoadedOnce && <button onClick={fetchData} className="mt-4 text-xs font-bold text-indigo-400 hover:underline">Trigger Initial Sweep</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendingSection;
