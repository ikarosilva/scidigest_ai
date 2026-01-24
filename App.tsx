
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ArticleCard from './components/ArticleCard';
import FeedMonitor from './components/FeedMonitor';
import InterestsManager from './components/InterestsManager';
import TrendingSection from './components/TrendingSection';
import { dbService } from './services/dbService';
import { exportService } from './services/exportService';
import { geminiService } from './services/geminiService';
import { Article, Book, Sentiment } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('feed');
  const [data, setData] = useState(dbService.getData());
  const [interests, setInterests] = useState(dbService.getInterests());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [apaCitations, setApaCitations] = useState<string | null>(null);
  const [isGeneratingCitations, setIsGeneratingCitations] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'All'>('All');
  const [filterHasCode, setFilterHasCode] = useState(false);
  const [filterHasData, setFilterHasData] = useState(false);

  useEffect(() => {
    setData(dbService.getData());
    setInterests(dbService.getInterests());
  }, []);

  const handleUpdateInterests = (newInterests: string[]) => {
    setInterests(newInterests);
    dbService.saveInterests(newInterests);
  };

  const handleUpdateArticle = (id: string, updates: Partial<Article>) => {
    const newData = dbService.updateArticle(id, updates);
    setData({ ...newData });
  };

  const handleAddArticle = (article: Article) => {
    const newData = dbService.addArticle(article);
    setData({ ...newData });
    alert('Article added to library!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImporting(true);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        
        // Use Gemini to intelligently filter the book list based on user topics (interests)
        const filteredBooks = await geminiService.filterBooks(json, interests);
        
        if (filteredBooks.length > 0) {
          const newData = dbService.addBooks(filteredBooks);
          setData({ ...newData });
          alert(`Success! Ingested ${filteredBooks.length} relevant scientific books. Your recommendations will now prioritize these areas of interest.`);
        } else {
          alert('No relevant scientific books found in the provided list based on your Research Topics.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to process file. Ensure it is a valid JSON GoodReads export.');
      }
      setIsImporting(false);
    }
  };

  const handleExportBibTeX = () => {
    const bibtex = exportService.generateBibTeX(data.articles);
    exportService.downloadFile(bibtex, 'scidigest_export.bib', 'text/plain');
  };

  const handleGenerateAPA = async () => {
    setIsGeneratingCitations(true);
    try {
      const citations = await geminiService.generateAPACitations(data.articles);
      setApaCitations(citations || "Error generating citations.");
    } catch (e) {
      setApaCitations("Failed to generate citations. Check API key.");
    }
    setIsGeneratingCitations(false);
  };

  // Memoized Filtered Articles
  const filteredArticles = useMemo(() => {
    return data.articles.filter((article: Article) => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            article.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            article.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSentiment = filterSentiment === 'All' || article.userReviews.sentiment === filterSentiment;
      const matchesCode = !filterHasCode || !!article.sourceCode;
      const matchesData = !filterHasData || !!article.dataLocation;
      
      return matchesSearch && matchesSentiment && matchesCode && matchesData;
    });
  }, [data.articles, searchQuery, filterSentiment, filterHasCode, filterHasData]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
      />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'dashboard' && <Dashboard articles={data.articles} onNavigate={setCurrentTab} />}
          
          {currentTab === 'interests' && (
            <InterestsManager 
              interests={interests} 
              onUpdateInterests={handleUpdateInterests} 
            />
          )}

          {currentTab === 'trending' && (
            <TrendingSection 
              interests={interests}
              onAdd={handleAddArticle}
            />
          )}

          {currentTab === 'library' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Your Library</h2>
                  <p className="text-slate-400">Query and manage your research collection.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsExporting(true)}
                    className="bg-indigo-500/10 text-indigo-400 px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                  >
                    📤 Export Library
                  </button>
                  <button className="bg-slate-100 text-slate-950 px-5 py-2 rounded-xl text-sm font-bold hover:bg-white transition-colors">
                    + Manually Add
                  </button>
                </div>
              </header>

              {/* Advanced Filter Bar */}
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Search Query</label>
                  <input 
                    type="text" 
                    placeholder="Search by title, author, or abstract..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Sentiment</label>
                  <select 
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    value={filterSentiment}
                    onChange={(e) => setFilterSentiment(e.target.value as Sentiment | 'All')}
                  >
                    <option value="All">All Reception</option>
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 mb-2 h-9">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                      checked={filterHasCode}
                      onChange={(e) => setFilterHasCode(e.target.checked)}
                    />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">Has Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                      checked={filterHasData}
                      onChange={(e) => setFilterHasData(e.target.checked)}
                    />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">Has Data</span>
                  </label>
                </div>
                <button 
                  onClick={() => { setSearchQuery(''); setFilterSentiment('All'); setFilterHasCode(false); setFilterHasData(false); }}
                  className="text-xs text-slate-500 hover:text-slate-300 mb-2 underline underline-offset-4"
                >
                  Clear Filters
                </button>
              </div>

              {isExporting && (
                <div className="bg-indigo-950/80 border border-indigo-500/30 backdrop-blur-xl rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                  <button 
                    onClick={() => { setIsExporting(false); setApaCitations(null); }}
                    className="absolute top-4 right-4 text-indigo-300/60 hover:text-white"
                  >
                    ✕ Close
                  </button>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Export Bibliography</h3>
                    <p className="text-indigo-200 mb-6 text-sm max-w-xl">
                      Download your collection in professional research formats or generate high-accuracy APA citations for your next paper.
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleExportBibTeX}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-indigo-500 transition-all active:scale-95"
                      >
                        Download BibTeX (for Zotero)
                      </button>
                      <button 
                        onClick={handleGenerateAPA}
                        disabled={isGeneratingCitations}
                        className="bg-slate-800 text-indigo-400 border border-indigo-500/30 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingCitations ? 'Generating APA...' : 'Generate APA List'}
                      </button>
                    </div>

                    {apaCitations && (
                      <div className="mt-8 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-400">APA Bibliography</h4>
                          <button 
                            onClick={() => { navigator.clipboard.writeText(apaCitations); alert('Copied to clipboard!'); }}
                            className="text-xs bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1 rounded-full transition-colors"
                          >
                            Copy to Clipboard
                          </button>
                        </div>
                        <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-slate-300 bg-black/40 p-4 rounded-xl max-h-64 overflow-y-auto border border-white/5">
                          {apaCitations}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full opacity-10 blur-3xl"></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredArticles.length > 0 ? filteredArticles.map((article: Article) => (
                  <ArticleCard 
                    key={article.id} 
                    article={article} 
                    onUpdate={handleUpdateArticle} 
                  />
                )) : (
                  <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    <p className="text-slate-500 text-lg italic mb-2">Your library looks a bit quiet.</p>
                    <button 
                      onClick={() => setCurrentTab('feed')}
                      className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-4"
                    >
                      Discover new articles in the Feed Monitor →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'feed' && (
            <FeedMonitor 
              ratedArticles={data.articles} 
              books={data.books} 
              onAdd={handleAddArticle} 
            />
          )}

          {currentTab === 'import' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                {isImporting ? '⏳' : '📚'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">
                  {isImporting ? 'Ingesting Reading List...' : 'Import GoodReads List'}
                </h2>
                <p className="text-slate-400 mt-2 max-w-md mx-auto">
                  {isImporting 
                    ? 'Gemini is currently sorting through your library to find scientific matches. This takes a few seconds...'
                    : 'Upload your scientific reading history from GoodReads to help Gemini understand your research foundation.'}
                </p>
              </div>
              
              {!isImporting && (
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                  <input 
                    type="file" 
                    className="hidden" 
                    id="goodreads-upload" 
                    accept=".json"
                    onChange={handleFileUpload} 
                  />
                  <label htmlFor="goodreads-upload" className="cursor-pointer">
                    <p className="text-lg font-semibold text-slate-300 group-hover:text-indigo-400">
                      Click to browse JSON file
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Maximum file size: 5MB</p>
                  </label>
                </div>
              )}

              {isImporting && (
                <div className="flex flex-col items-center gap-4 py-12">
                   <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                   <p className="text-sm text-indigo-400 font-medium">Analyzing non-fiction relevance...</p>
                </div>
              )}

              {data.books.length > 0 && !isImporting && (
                <div className="mt-8 text-left max-w-lg mx-auto">
                  <h4 className="font-bold text-slate-300 mb-2">Relevant Books Ingested ({data.books.length})</h4>
                  <ul className="space-y-2">
                    {data.books.slice(0, 10).map((book: Book) => (
                      <li key={book.id} className="text-sm text-slate-400 flex justify-between p-2 bg-slate-800 rounded border border-slate-700">
                        <span className="truncate pr-4">{book.title}</span>
                        <span className="font-bold text-indigo-400 shrink-0">Rating: {book.rating}</span>
                      </li>
                    ))}
                    {data.books.length > 10 && (
                      <li className="text-[10px] text-slate-600 text-center">+ {data.books.length - 10} more relevant works</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-slate-100 mb-6">Settings</h2>
              <div className="space-y-6">
                <section>
                  <h3 className="font-semibold text-slate-300 mb-3">Feed Sources</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['HuggingFace', 'arXiv', 'Nature', 'Medium', 'Google Scholar', 'TF Blog'].map(src => (
                      <label key={src} className="flex items-center gap-3 p-3 border border-slate-800 rounded-xl hover:bg-slate-800/50 cursor-pointer group">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">{src}</span>
                      </label>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="font-semibold text-slate-300 mb-3">AI Configuration</h3>
                  <div className="bg-slate-950/50 p-4 rounded-xl space-y-4 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Model Precision</span>
                      <select className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                        <option>Gemini 3 Flash (Fast)</option>
                        <option>Gemini 3 Pro (Deep)</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">RLHF Feedback Loop</span>
                      <button className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded">Active</button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
