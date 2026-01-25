
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Academy from './components/Academy';
import ArticleCard from './components/ArticleCard';
import BookCard from './components/BookCard';
import FeedMonitor from './components/FeedMonitor';
import Tracker from './components/Tracker';
import FeedsSection from './components/FeedsSection';
import ShelvesSection from './components/ShelvesSection';
import TrendingSection from './components/TrendingSection';
import NotesSection from './components/NotesSection';
import SettingsSection from './components/SettingsSection';
import NetworkGraph from './components/NetworkGraph';
import Reader from './components/Reader';
import FeedbackModal from './components/FeedbackModal';
import SynthesisModal from './components/SynthesisModal';
import InterestsManager from './components/InterestsManager';
import VersionSection from './components/VersionSection';
import LogSection from './components/LogSection';
import GuideSection from './components/GuideSection';
import { dbService, APP_VERSION } from './services/dbService';
import { exportService } from './services/exportService';
import { geminiService } from './services/geminiService';
import { cloudSyncService } from './services/cloudSyncService';
import { Article, Book, Note, Sentiment, SyncStatus, Feed, AIConfig, AppState, SocialProfiles, FeedSourceType, Shelf } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('feed');
  const [data, setData] = useState<AppState>(dbService.getData());
  const [interests, setInterests] = useState<string[]>(dbService.getInterests());
  const [feeds, setFeeds] = useState<Feed[]>(dbService.getFeeds());
  const [aiConfig, setAIConfig] = useState<AIConfig>(dbService.getAIConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSyncKey, setShowSyncKey] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [isProcessingBooks, setIsProcessingBooks] = useState(false);
  const [isSyncingScholar, setIsSyncingScholar] = useState(false);
  const [activeReadingArticle, setActiveReadingArticle] = useState<Article | null>(null);
  const [showImportBooks, setShowImportBooks] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Synthesis state
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  // Cross-tab interaction state
  const [networkFocusId, setNetworkFocusId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'All'>('All');

  // Listen for custom events (from cards not managed directly by state)
  useEffect(() => {
    const handleUpdate = () => setData(dbService.getData());
    window.addEventListener('db-update', handleUpdate);
    return () => window.removeEventListener('db-update', handleUpdate);
  }, []);

  // Cloud Sync Integration
  useEffect(() => {
    cloudSyncService.init((status: string) => {
      setSyncStatus(status as SyncStatus);
    });
  }, []);

  const ensureApiKey = async () => {
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowApiKeyDialog(true);
      return false;
    }
    return true;
  };

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setShowApiKeyDialog(false);
    }
  };

  const performCloudSync = useCallback(async (localData: AppState) => {
    if (syncStatus === 'disconnected' || syncStatus === 'error') return;
    setSyncStatus('syncing');
    
    try {
      const cloudFile = await cloudSyncService.findSyncFile();
      if (cloudFile) {
        const cloudData: any = await cloudSyncService.downloadData(cloudFile.id);
        if (cloudData && cloudData.data) {
          const cloudTime = new Date(cloudData.data.lastModified).getTime();
          const localTime = new Date(localData.lastModified).getTime();

          if (cloudTime > localTime) {
            if (confirm("New research data found on another device. Update now?")) {
              const { success } = dbService.importFullBackup(JSON.stringify(cloudData));
              if (success) {
                dbService.addLog('info', 'Cloud sync: Successfully merged remote data into local context.');
                window.location.reload();
                return;
              }
            }
          }
        }
      }
      
      const currentInterests = dbService.getInterests();
      const currentFeeds = dbService.getFeeds();
      const currentAIConfig = dbService.getAIConfig();
      const payload = { 
        version: APP_VERSION, 
        data: localData, 
        interests: currentInterests, 
        feeds: currentFeeds,
        aiConfig: currentAIConfig,
        timestamp: new Date().toISOString() 
      };
      const success = await cloudSyncService.uploadData(payload);
      setSyncStatus(success ? 'synced' : 'error');
      if (!success) dbService.addLog('error', 'Cloud sync: Upload operation failed.');
    } catch (e) {
      console.error("Sync Error", e);
      setSyncStatus('error');
      dbService.addLog('error', `Cloud sync exception: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [syncStatus]);

  useEffect(() => {
    if (syncStatus === 'synced') {
      const interval = setInterval(() => performCloudSync(data), 60000 * 5);
      return () => clearInterval(interval);
    }
  }, [syncStatus, data, performCloudSync]);

  const handleCloudSignIn = () => {
    cloudSyncService.signIn((success: boolean) => {
      if (success) {
        setSyncStatus('synced');
        performCloudSync(data);
      }
    });
  };

  const handleCloudSignOut = () => {
    cloudSyncService.signOut();
    setSyncStatus('disconnected');
  };

  const handleSaveSyncKey = () => {
    if (inputSyncKey.length < 8) {
      alert("Key must be at least 8 characters.");
      return;
    }
    dbService.setSyncKey(inputSyncKey);
    alert("Sync Key updated. Cloud data will now be encrypted with this key.");
    setInputSyncKey('');
    setShowSyncKey(false);
  };

  const handleUpdateArticle = (id: string, updates: Partial<Article>) => {
    const newData = dbService.updateArticle(id, updates);
    setData({ ...newData });
    if (activeReadingArticle?.id === id) {
       setActiveReadingArticle(prev => prev ? { ...prev, ...updates } : null);
    }
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleUpdateBook = (id: string, updates: Partial<Book>) => {
    const newData = dbService.updateBook(id, updates);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleUpdateShelves = (newShelves: Shelf[]) => {
    const newData = { ...data, shelves: newShelves };
    setData(newData);
    dbService.saveData(newData);
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleAddReadTime = (id: string, seconds: number) => {
    const newData = dbService.addReadTime(id, seconds);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleAddArticle = (article: Article) => {
    const newData = dbService.addArticle(article);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
    alert('Article added to library!');
  };

  const handleSyncScholarArticles = async () => {
    const hasKey = await ensureApiKey();
    if (!hasKey) return;

    let currentProfiles = { ...data.socialProfiles };
    
    if (!currentProfiles.name && !currentProfiles.googleScholar) {
      const input = prompt("Enter your Full Name OR paste your Google Scholar Profile URL:");
      if (!input || !input.trim()) return;
      
      const trimmedInput = input.trim();
      if (trimmedInput.startsWith('http')) {
        currentProfiles.googleScholar = trimmedInput;
      } else {
        currentProfiles.name = trimmedInput;
      }
      handleUpdateSocialProfiles(currentProfiles);
    }
    
    setIsSyncingScholar(true);
    dbService.addLog('info', 'Scholar Sync initiated: Requesting grounding via Gemini 3.');

    try {
      const scholarPapers = await geminiService.fetchScholarArticles(currentProfiles);
      
      if (!scholarPapers || scholarPapers.length === 0) {
        dbService.addLog('warning', 'Scholar Sync: No papers returned by AI model.');
        alert("No publications found. Try refining your name or ensuring the profile URL is correct.");
        return;
      }

      const existingTitles = new Set(data.articles.map(a => a.title.toLowerCase().trim()));
      const newArticles: Article[] = [];

      scholarPapers.forEach(p => {
        const cleanTitle = (p.title || '').toLowerCase().trim();
        if (cleanTitle && !existingTitles.has(cleanTitle)) {
          newArticles.push({
            id: Math.random().toString(36).substr(2, 9),
            title: p.title || 'Untitled Publication',
            authors: p.authors || [],
            abstract: p.abstract || '',
            date: `${p.year || '2024'}-01-01`,
            year: p.year || 'Unknown',
            source: FeedSourceType.GOOGLE_SCHOLAR,
            rating: 10,
            tags: p.tags || ['Publication'],
            isBookmarked: true,
            notes: 'Imported from your Google Scholar profile.',
            noteIds: [],
            userReadTime: 0,
            estimatedReadTime: 20,
            shelfIds: [],
            userReviews: {
              sentiment: 'Positive',
              summary: 'Your own publication discovered via Scholar.',
              citationCount: (p as any).citationCount || 0,
              citedByUrl: (p as any).scholarUrl || ''
            }
          });
        }
      });

      if (newArticles.length > 0) {
        const updatedData = dbService.addArticles(newArticles);
        setData({ ...updatedData });
        dbService.addLog('info', `Scholar Sync: Successfully imported ${newArticles.length} new publications.`);
        alert(`Successfully imported ${newArticles.length} new publications!`);
        if (syncStatus === 'synced') performCloudSync(updatedData);
      } else {
        dbService.addLog('info', 'Scholar Sync: Library already up to date.');
        alert("Your library is already up to date with your profile.");
      }
    } catch (err: any) {
      console.error("Scholar Sync Critical Error:", err);
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      dbService.addLog('error', `Scholar Sync failed. Details: ${errorMsg}`);
      
      if (err instanceof Error && err.message.includes("Requested entity was not found")) {
        alert("Your API key configuration appears invalid or the selected model is not available for this key. Please reconnect.");
        setShowApiKeyDialog(true);
      } else {
        alert("Failed to connect to search service. Ensure your profile is public and Google Search Grounding is available. Check System Logs for detailed error info.");
      }
    } finally {
      setIsSyncingScholar(false);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    const newData = dbService.updateNote(id, updates);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleAddNote = (note: Note) => {
    const newData = dbService.addNote(note);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleUpdateFeeds = (newFeeds: Feed[]) => {
    setFeeds(newFeeds);
    dbService.saveFeeds(newFeeds);
    if (syncStatus === 'synced') performCloudSync(data);
  };

  const handleUpdateAIConfig = (newConfig: AIConfig) => {
    setAIConfig(newConfig);
    dbService.saveAIConfig(newConfig);
    if (syncStatus === 'synced') performCloudSync(data);
  };

  const handleUpdateSocialProfiles = (newProfiles: SocialProfiles) => {
    dbService.saveSocialProfiles(newProfiles);
    setData({ ...data, socialProfiles: newProfiles });
    if (syncStatus === 'synced') performCloudSync({ ...data, socialProfiles: newProfiles });
  };

  const handleOpenReader = (article: Article) => {
    setActiveReadingArticle(article);
    setCurrentTab('reader');
  };

  const handleExploreNetwork = (id: string) => {
    setNetworkFocusId(id);
    setCurrentTab('networks');
  };

  const handleGoodReadsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingBooks(true);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const filteredBooks = await geminiService.filterBooks(json, interests);
        if (filteredBooks.length > 0) {
          const newData = dbService.addBooks(filteredBooks);
          setData({ ...newData });
          alert(`Success! AI librarian ingested ${filteredBooks.length} relevant scientific books into your context.`);
          setShowImportBooks(false);
          dbService.addLog('info', `Successfully ingested ${filteredBooks.length} books from GoodReads export.`);
        } else {
          alert('No relevant scientific books found in that file.');
        }
      } catch (err) {
        dbService.addLog('error', `GoodReads Ingestion failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
        alert('Failed to process GoodReads file. Please ensure it is a valid JSON export.');
      }
      setIsProcessingBooks(false);
    }
  };

  const handleManualImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      const { success } = dbService.importFullBackup(text);
      if (success) {
        alert("Database restored successfully.");
        dbService.addLog('info', 'Manual data restoration completed successfully.');
        window.location.reload();
      } else {
        dbService.addLog('error', 'Manual restoration attempt failed: Invalid file format.');
        alert("Failed to restore. Invalid file format.");
      }
    }
  };

  const handleClearLogs = () => {
    if (confirm("Clear system log buffer? This cannot be undone.")) {
      dbService.clearLogs();
      setData(dbService.getData());
    }
  };

  const filteredArticles = useMemo(() => {
    return data.articles.filter((article: Article) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = article.title.toLowerCase().includes(q) || 
                            article.abstract.toLowerCase().includes(q) ||
                            article.authors.some((a: string) => a.toLowerCase().includes(q));
      const matchesSentiment = filterSentiment === 'All' || article.userReviews.sentiment === filterSentiment;
      return matchesSearch && matchesSentiment;
    });
  }, [data.articles, searchQuery, filterSentiment]);

  const filteredBooks = useMemo(() => {
    return (data.books || []).filter((book: Book) => {
      const q = searchQuery.toLowerCase();
      return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
    });
  }, [data.books, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedArticleIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-inter">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        onOpenFeedback={() => setShowFeedback(true)}
        syncStatus={syncStatus}
      />
      
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      
      {showSynthesisModal && (
        <SynthesisModal 
          articles={data.articles.filter(a => selectedArticleIds.includes(a.id))}
          notes={data.notes.filter(n => n.articleIds.some(aid => selectedArticleIds.includes(aid)))}
          onClose={() => setShowSynthesisModal(false)}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔑</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Connect Pro Assistant</h3>
            <p className="text-slate-400 text-sm">
              Advanced features like Google Scholar Sync and Deep Research require a project-linked API key. 
              Please select a key from a project with <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 underline">billing enabled</a>.
            </p>
            <button 
              onClick={handleOpenSelectKey}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
            >
              Select Google Cloud Key
            </button>
            <button 
              onClick={() => setShowApiKeyDialog(false)}
              className="text-slate-500 hover:text-slate-300 text-xs font-bold"
            >
              Skip (Pro features will be disabled)
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'academy' && (
            <Academy 
              articles={data.articles} 
              totalReadTime={data.totalReadTime}
              onNavigate={setCurrentTab} 
              onRead={handleOpenReader} 
            />
          )}

          {currentTab === 'tracker' && (
            <Tracker 
              onAdd={handleAddArticle} 
              onRead={handleOpenReader} 
            />
          )}
          
          {currentTab === 'shelves' && (
             <ShelvesSection 
               articles={data.articles}
               books={data.books}
               shelves={data.shelves}
               onUpdateArticle={handleUpdateArticle}
               onUpdateBook={handleUpdateBook}
               onUpdateShelves={handleUpdateShelves}
               onRead={handleOpenReader}
               onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
               allNotes={data.notes}
             />
          )}

          {currentTab === 'trending' && <TrendingSection interests={interests} onAdd={handleAddArticle} onRead={handleOpenReader} />}

          {currentTab === 'reader' && (
            <Reader 
              article={activeReadingArticle} 
              notes={data.notes}
              onNavigateToLibrary={() => setCurrentTab('library')}
              onUpdateNote={handleUpdateNote}
              onCreateNote={handleAddNote}
              onUpdateArticle={handleUpdateArticle}
              onAddReadTime={handleAddReadTime}
            />
          )}

          {currentTab === 'networks' && (
            <NetworkGraph 
              articles={data.articles} 
              notes={data.notes}
              books={data.books}
              onUpdateArticle={handleUpdateArticle}
              focusNodeId={networkFocusId}
              onClearFocus={() => setNetworkFocusId(null)}
              onNavigateToArticle={(aid: string) => {
                const article = data.articles.find((a: Article) => a.id === aid);
                if (article) handleOpenReader(article);
              }}
              onNavigateToNote={(nid: string) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
            />
          )}

          {currentTab === 'notes' && (
            <NotesSection 
              notes={data.notes}
              articles={data.articles}
              activeNoteId={activeNoteId}
              setActiveNoteId={setActiveNoteId}
              onUpdate={handleUpdateNote}
              onCreate={() => {
                const nn = { id: Math.random().toString(36).substr(2, 9), title: 'New Note', content: '', articleIds: [], lastEdited: new Date().toISOString() };
                setData(dbService.addNote(nn));
              }}
              onDelete={(id: string) => setData(dbService.deleteNote(id))}
              onNavigateToArticle={(aid: string) => {
                const article = data.articles.find((a: Article) => a.id === aid);
                if (article) handleOpenReader(article);
              }}
              onNavigateToNetwork={handleExploreNetwork}
            />
          )}

          {currentTab === 'library' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Your Library</h2>
                  <p className="text-slate-400">Manage your research collection and books.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-3">
                    {selectedArticleIds.length > 0 && (
                      <button 
                        onClick={() => setShowSynthesisModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 animate-in zoom-in"
                      >
                        ✨ Synthesize ({selectedArticleIds.length})
                      </button>
                    )}
                    <button 
                      onClick={handleSyncScholarArticles}
                      disabled={isSyncingScholar}
                      className={`px-5 py-2 rounded-xl text-sm font-medium transition-all border ${
                        isSyncingScholar ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {isSyncingScholar ? 'Syncing Scholar...' : '🎓 Sync My Publications'}
                    </button>
                    <button 
                      onClick={() => setShowImportBooks(!showImportBooks)}
                      className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors border ${showImportBooks ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                    >
                      {showImportBooks ? 'Close Ingestion' : '📥 Import Books'}
                    </button>
                    <button 
                      onClick={() => exportService.downloadFile(exportService.generateBibTeX(data.articles), 'scidigest_export.bib', 'text/plain')}
                      className="bg-indigo-500/10 text-indigo-400 px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                    >
                      📄 Export BibTeX
                    </button>
                  </div>
                  {(!data.socialProfiles.name && !data.socialProfiles.googleScholar) && (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                      <span className="animate-pulse">💡</span> Tip: Sync will ask for your name or profile URL if not set.
                    </span>
                  )}
                </div>
              </header>

              <div className="mb-4 flex gap-4">
                 <input 
                   type="text"
                   placeholder="Search library..."
                   className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 <select 
                    value={filterSentiment}
                    onChange={(e) => setFilterSentiment(e.target.value as Sentiment | 'All')}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-4 py-2 rounded-xl outline-none"
                 >
                    <option value="All">All Receptions</option>
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                 </select>
              </div>

              {showImportBooks && (
                <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-8 text-center space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-xl shadow-amber-500/5">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-2">
                    <span>📚</span> AI Book Ingestion
                  </h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Upload your GoodReads list. The AI Librarian will filter for relevant scientific non-fiction matching your research topics.
                  </p>
                  
                  {isProcessingBooks ? (
                    <div className="py-12 flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                      <p className="text-amber-400 font-bold animate-pulse uppercase tracking-widest text-xs">AI Librarian is Filtering...</p>
                    </div>
                  ) : (
                    <>
                      <input type="file" className="hidden" id="goodreads-upload-library" accept=".json" onChange={handleGoodReadsUpload} />
                      <label htmlFor="goodreads-upload-library" className="cursor-pointer block border-2 border-dashed border-slate-800 rounded-2xl p-12 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all group">
                        <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📘</span>
                        <p className="text-lg font-semibold text-slate-300">Choose GoodReads JSON</p>
                        <p className="text-sm text-slate-500 mt-2">Maximum file size: 10MB</p>
                      </label>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-12">
                {/* Articles Section */}
                {filteredArticles.length > 0 && (
                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-slate-800"></span> Research Articles
                      </h3>
                      {selectedArticleIds.length > 0 && (
                        <button onClick={() => setSelectedArticleIds([])} className="text-[10px] text-slate-600 hover:text-slate-300 font-bold uppercase">Deselect All</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredArticles.map((article: Article) => (
                        <div key={article.id} className="relative">
                          <button 
                            onClick={() => toggleSelection(article.id)}
                            className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold ${
                              selectedArticleIds.includes(article.id) ? 'bg-indigo-600 border-white text-white' : 'bg-slate-800 border-slate-700 text-transparent'
                            }`}
                          >
                            ✓
                          </button>
                          <ArticleCard 
                            article={article} 
                            allNotes={data.notes}
                            onUpdate={handleUpdateArticle} 
                            onNavigateToNote={(nid: string) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
                            onRead={() => handleOpenReader(article)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Books Section */}
                {filteredBooks.length > 0 && (
                  <section>
                    <h3 className="text-sm font-black text-amber-500/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-8 h-[1px] bg-amber-500/20"></span> Scientific Books
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBooks.map((book: Book) => (
                        <BookCard key={book.id} book={book} />
                      ))}
                    </div>
                  </section>
                )}

                {filteredArticles.length === 0 && filteredBooks.length === 0 && !showImportBooks && (
                  <div className="py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    <p className="text-slate-500 italic">Your library is empty or no matches found. Start by ingesting articles from "AI Recommends" or "Trending".</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'feed' && <FeedMonitor ratedArticles={data.articles} books={data.books} onAdd={handleAddArticle} onRead={handleOpenReader} activeFeeds={feeds.filter(f => f.active)} aiConfig={aiConfig} />}
          
          {currentTab === 'topics' && (
            <div className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                  <span>🎯</span> Research Topics
                </h2>
                <p className="text-slate-400 mt-1">Configure your interests manually or discover them via AI from your social profiles.</p>
              </header>
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl mt-8">
                <InterestsManager 
                  interests={interests} 
                  onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }}
                  socialProfiles={data.socialProfiles}
                  onUpdateSocialProfiles={handleUpdateSocialProfiles}
                />
              </div>
            </div>
          )}

          {currentTab === 'feeds' && (
            <FeedsSection 
              feeds={feeds} 
              onUpdateFeeds={handleUpdateFeeds}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsSection 
              aiConfig={aiConfig} 
              onUpdateAIConfig={handleUpdateAIConfig} 
              interests={interests}
              onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }}
              socialProfiles={data.socialProfiles}
              onUpdateSocialProfiles={handleUpdateSocialProfiles}
            />
          )}

          {currentTab === 'version' && <VersionSection />}

          {currentTab === 'logs' && <LogSection logs={data.logs} onClear={handleClearLogs} />}
          
          {currentTab === 'guide' && <GuideSection />}

          {currentTab === 'portability' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2"><span>💾</span> Data & Privacy</h2>
                  <p className="text-slate-400 mt-1">Local-First portability and cloud synchronization.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Version {APP_VERSION}</span>
                </div>
              </header>

              {/* Security Credentials Section */}
              <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-8">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-emerald-300">Security Credentials</h3>
                      <p className="text-sm text-emerald-400/80 mt-1 max-w-md">
                        This key encrypts your data before it leaves your browser. Keep it secret.
                      </p>
                    </div>
                    <span className="text-4xl">🔐</span>
                 </div>

                 <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowSyncKey(!showSyncKey)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2"
                      >
                        {showSyncKey ? '🙈 Hide Sync Key' : '👁️ Reveal Sync Key'}
                      </button>
                    </div>
                    
                    {showSyncKey && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20 break-all font-mono text-xs text-emerald-300">
                        {dbService.getSyncKey()}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-emerald-500/10">
                      <label className="text-[10px] uppercase font-bold text-emerald-500/60 mb-2 block tracking-widest">Update Key (Relink Device)</label>
                      <div className="flex gap-2">
                        <input 
                          type="password"
                          value={inputSyncKey}
                          onChange={(e) => setInputSyncKey(e.target.value)}
                          placeholder="Paste existing Sync Key..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button 
                          onClick={handleSaveSyncKey}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-6 py-2 rounded-xl border border-emerald-500/20 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cloud Sync Section */}
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-indigo-300">Cloud Relay</h3>
                      <p className="text-sm text-indigo-400/80 mt-1">
                        Automated synchronization across all Chrome devices via Google Drive.
                      </p>
                    </div>
                    <span className="text-4xl">☁️</span>
                  </div>
                  
                  <div className="mt-auto space-y-4">
                    {syncStatus === 'disconnected' ? (
                      <button 
                        onClick={handleCloudSignIn}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
                      >
                        Sign In with Google
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => performCloudSync(data)}
                          className={`w-full font-bold py-4 rounded-2xl transition-all ${
                            syncStatus === 'syncing' ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20'
                          }`}
                          disabled={syncStatus === 'syncing'}
                        >
                          {syncStatus === 'syncing' ? '🔄 Syncing...' : '🔄 Sync Now (Manual)'}
                        </button>
                        <button 
                          onClick={handleCloudSignOut}
                          className="w-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 font-bold py-4 rounded-2xl transition-all"
                        >
                          Sign Out
                        </button>
                      </>
                    )}
                    <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest font-bold text-center">
                      Last Attempt: {new Date(data.lastModified).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Manual Management Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-200">Local Management</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Hard-copy backups and researcher-specific export formats.
                      </p>
                    </div>
                    <span className="text-4xl">📂</span>
                  </div>
                  
                  <div className="mt-auto space-y-4">
                    <button 
                      onClick={() => exportService.downloadFile(dbService.exportFullBackup(), `scidigest_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json')} 
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
                    >
                      💾 Download JSON Backup
                    </button>
                    
                    <input type="file" accept=".json" onChange={handleManualImport} className="hidden" id="manual-restore" />
                    <label htmlFor="manual-restore" className="w-full border-2 border-slate-800 hover:bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center">
                      📥 Restore from JSON File
                    </label>

                    <button 
                      onClick={() => exportService.downloadFile(exportService.generateBibTeX(data.articles), 'scidigest_export.bib', 'text/plain')}
                      className="w-full border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 font-bold py-4 rounded-2xl transition-all"
                    >
                      📄 Export as BibTeX (.bib)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
