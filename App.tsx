
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ArticleCard from './components/ArticleCard';
import FeedMonitor from './components/FeedMonitor';
import InterestsManager from './components/InterestsManager';
import TrendingSection from './components/TrendingSection';
import NotesSection from './components/NotesSection';
import SettingsSection from './components/SettingsSection';
import NetworkGraph from './components/NetworkGraph';
import Reader from './components/Reader';
import FeedbackModal from './components/FeedbackModal';
import { dbService, APP_VERSION } from './services/dbService';
import { exportService } from './services/exportService';
import { geminiService } from './services/geminiService';
import { cloudSyncService } from './services/cloudSyncService';
import { Article, Book, Note, Sentiment, SyncStatus, Feed, AIConfig } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('feed');
  const [data, setData] = useState(dbService.getData());
  const [interests, setInterests] = useState(dbService.getInterests());
  const [feeds, setFeeds] = useState<Feed[]>(dbService.getFeeds());
  const [aiConfig, setAIConfig] = useState<AIConfig>(dbService.getAIConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSyncKey, setShowSyncKey] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [isProcessingBooks, setIsProcessingBooks] = useState(false);
  const [activeReadingArticle, setActiveReadingArticle] = useState<Article | null>(null);
  const [showImportBooks, setShowImportBooks] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'All'>('All');

  // Cloud Sync Integration
  useEffect(() => {
    cloudSyncService.init((status) => {
      setSyncStatus(status as SyncStatus);
    });
  }, []);

  const performCloudSync = useCallback(async (localData: any) => {
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
    } catch (e) {
      console.error("Sync Error", e);
      setSyncStatus('error');
    }
  }, [syncStatus]);

  useEffect(() => {
    if (syncStatus === 'synced') {
      const interval = setInterval(() => performCloudSync(data), 60000 * 5);
      return () => clearInterval(interval);
    }
  }, [syncStatus, data, performCloudSync]);

  const handleCloudSignIn = () => {
    cloudSyncService.signIn((success) => {
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
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleAddArticle = (article: Article) => {
    const newData = dbService.addArticle(article);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
    alert('Article added to library!');
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

  const handleOpenReader = (article: Article) => {
    setActiveReadingArticle(article);
    setCurrentTab('reader');
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
        } else {
          alert('No relevant scientific books found in that file.');
        }
      } catch (err) {
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
        window.location.reload();
      } else {
        alert("Failed to restore. Invalid file format.");
      }
    }
  };

  const filteredArticles = useMemo(() => {
    return data.articles.filter((article: Article) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = article.title.toLowerCase().includes(q) || 
                            article.abstract.toLowerCase().includes(q) ||
                            article.authors.some(a => a.toLowerCase().includes(q));
      const matchesSentiment = filterSentiment === 'All' || article.userReviews.sentiment === filterSentiment;
      return matchesSearch && matchesSentiment;
    });
  }, [data.articles, searchQuery, filterSentiment]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-inter">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        onOpenFeedback={() => setShowFeedback(true)}
        syncStatus={syncStatus}
      />
      
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'dashboard' && <Dashboard articles={data.articles} onNavigate={setCurrentTab} onRead={handleOpenReader} />}
          
          {currentTab === 'interests' && (
            <InterestsManager 
              interests={interests} 
              onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} 
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
            />
          )}

          {currentTab === 'networks' && (
            <NetworkGraph 
              articles={data.articles} 
              notes={data.notes} 
              onUpdateArticle={handleUpdateArticle}
              onNavigateToArticle={(aid) => {
                const article = data.articles.find(a => a.id === aid);
                if (article) handleOpenReader(article);
              }}
              onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
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
              onDelete={(id) => setData(dbService.deleteNote(id))}
              onNavigateToArticle={(aid) => {
                const article = data.articles.find(a => a.id === aid);
                if (article) handleOpenReader(article);
              }}
            />
          )}

          {currentTab === 'library' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Your Library</h2>
                  <p className="text-slate-400">Manage your research collection and books.</p>
                </div>
                <div className="flex gap-3">
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
              </header>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredArticles.map((article: Article) => (
                  <ArticleCard 
                    key={article.id} 
                    article={article} 
                    allNotes={data.notes}
                    onUpdate={handleUpdateArticle} 
                    onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
                    onRead={() => handleOpenReader(article)}
                  />
                ))}
                {filteredArticles.length === 0 && !showImportBooks && (
                  <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                    <p className="text-slate-500 italic">Your library is empty. Start by ingesting articles from "AI Recommends" or "Trending".</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'feed' && <FeedMonitor ratedArticles={data.articles} books={data.books} onAdd={handleAddArticle} onRead={handleOpenReader} activeFeeds={feeds.filter(f => f.active)} aiConfig={aiConfig} />}
          
          {currentTab === 'settings' && <SettingsSection feeds={feeds} onUpdateFeeds={handleUpdateFeeds} aiConfig={aiConfig} onUpdateAIConfig={handleUpdateAIConfig} />}

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
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
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
