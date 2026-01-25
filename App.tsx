
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
import ManualAddModal from './components/ManualAddModal';
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
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [isSyncingScholar, setIsSyncingScholar] = useState(false);
  const [activeReadingArticle, setActiveReadingArticle] = useState<Article | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [networkFocusId, setNetworkFocusId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const updatedData = dbService.getData();
      setData(updatedData);
      setInterests(dbService.getInterests());
      setFeeds(dbService.getFeeds());
      setAIConfig(dbService.getAIConfig());
    };
    window.addEventListener('db-update', handleUpdate);
    return () => window.removeEventListener('db-update', handleUpdate);
  }, []);

  useEffect(() => {
    cloudSyncService.init((status: string) => setSyncStatus(status as SyncStatus));
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

  const isQuotaError = (err: any) => {
    const msg = (err?.message || JSON.stringify(err)).toLowerCase();
    return msg.includes('quota') || msg.includes('exhausted') || msg.includes('429') || msg.includes('limit');
  };

  const performCloudSync = useCallback(async (localData: AppState) => {
    if (syncStatus === 'disconnected' || syncStatus === 'error') return;
    setSyncStatus('syncing');
    try {
      const payload = { version: APP_VERSION, data: localData, interests: dbService.getInterests(), feeds: dbService.getFeeds(), aiConfig: dbService.getAIConfig(), timestamp: new Date().toISOString() };
      const success = await cloudSyncService.uploadData(payload);
      setSyncStatus(success ? 'synced' : 'error');
    } catch (e) {
      setSyncStatus('error');
    }
  }, [syncStatus]);

  const handleSyncScholarArticles = async () => {
    const hasKey = await ensureApiKey();
    if (!hasKey) return;
    let currentProfiles = { ...data.socialProfiles };
    if (!currentProfiles.name && !currentProfiles.googleScholar) {
      const input = prompt("Enter your Full Name OR paste your Google Scholar Profile URL:");
      if (!input || !input.trim()) return;
      const trimmedInput = input.trim();
      if (trimmedInput.startsWith('http')) currentProfiles.googleScholar = trimmedInput;
      else currentProfiles.name = trimmedInput;
      handleUpdateSocialProfiles(currentProfiles);
    }
    setIsSyncingScholar(true);
    try {
      const scholarPapers = await geminiService.fetchScholarArticles(currentProfiles);
      if (!scholarPapers || scholarPapers.length === 0) {
        alert("No publications found.");
        return;
      }
      const existingTitles = new Set(data.articles.map(a => a.title.toLowerCase().trim()));
      const newArticles: Article[] = [];
      scholarPapers.forEach(p => {
        const cleanTitle = (p.title || '').toLowerCase().trim();
        if (cleanTitle && !existingTitles.has(cleanTitle)) {
          newArticles.push({
            id: Math.random().toString(36).substr(2, 9),
            title: p.title || 'Untitled',
            authors: p.authors || [],
            abstract: p.abstract || '',
            date: `${p.year || '2024'}-01-01`,
            year: p.year || 'Unknown',
            source: FeedSourceType.GOOGLE_SCHOLAR,
            rating: 10,
            tags: p.tags || ['Publication'],
            isBookmarked: true,
            notes: 'Imported from Scholar.',
            noteIds: [],
            userReadTime: 0,
            shelfIds: [],
            userReviews: { sentiment: 'Positive', summary: 'Scholar discovery.', citationCount: (p as any).citationCount || 0 }
          });
        }
      });
      if (newArticles.length > 0) {
        const updatedData = dbService.addArticles(newArticles);
        setData({ ...updatedData });
        alert(`Imported ${newArticles.length} papers!`);
      }
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      dbService.addLog('error', `Scholar Sync failed: ${errorMsg}`);
      if (isQuotaError(err)) {
        setShowApiKeyDialog(true);
      } else {
        alert("Scholar Sync failed. Check System Logs.");
      }
    } finally {
      setIsSyncingScholar(false);
    }
  };

  const handleImportGoodReads = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const raw = JSON.parse(event.target.result);
          const rawBooks: any[] = Array.isArray(raw) ? raw : (raw.books || []);
          
          const existingTitles = new Set(data.books.map(b => b.title.toLowerCase().trim()));
          const userInterests = dbService.getInterests();
          
          const newBooks: Book[] = rawBooks
            .filter(b => b && b.book && b.read_status === 'read')
            .map(b => {
              // Inference: Find the interest that matches the book title most specifically (longest match)
              const matchedTopics = userInterests.filter(interest => 
                b.book.toLowerCase().includes(interest.toLowerCase())
              ).sort((x, y) => y.length - x.length);

              return {
                id: Math.random().toString(36).substr(2, 9),
                title: b.book,
                author: b.author || b.user || 'Unknown Author',
                rating: typeof b.rating === 'number' ? b.rating : (parseFloat(b.rating) || 0),
                dateAdded: b.created_at || new Date().toISOString(),
                amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(b.book)}`,
                description: b.review !== "(not provided)" ? b.review : (b.notes !== "(not provided)" ? b.notes : ""),
                shelfIds: [],
                tags: [...matchedTopics, 'GoodReads Import']
              };
            })
            // Only include books that match at least one of your trajectories
            .filter(b => b.tags.some(tag => userInterests.includes(tag)))
            .filter(b => !existingTitles.has(b.title.toLowerCase().trim()));

          if (newBooks.length > 0) {
            dbService.addBooks(newBooks);
            setData(dbService.getData());
            alert(`Imported ${newBooks.length} books inferred to match your research trajectories!`);
          } else {
            alert("No new 'read' books found that match your current research topics.");
          }
        } catch (err) {
          console.error("GoodReads Import Error:", err);
          alert("Failed to parse GoodReads JSON. Ensure it matches the required export format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleUpdateArticle = (id: string, updates: Partial<Article>) => {
    const newData = dbService.updateArticle(id, updates);
    setData({ ...newData });
    if (activeReadingArticle?.id === id) setActiveReadingArticle(prev => prev ? { ...prev, ...updates } : null);
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleUpdateBook = (id: string, updates: Partial<Book>) => {
    const newData = dbService.updateBook(id, updates);
    setData({ ...newData });
    if (syncStatus === 'synced') performCloudSync(newData);
  };

  const handleUpdateSocialProfiles = (newProfiles: SocialProfiles) => {
    dbService.saveSocialProfiles(newProfiles);
    setData({ ...dbService.getData() });
  };

  const handleOpenReader = (article: Article) => {
    setActiveReadingArticle(article);
    setCurrentTab('reader');
  };

  const handleOpenReaderById = (id: string) => {
    const article = data.articles.find(a => a.id === id);
    if (article) {
      handleOpenReader(article);
    }
  };

  const handleExportData = () => {
    const backup = dbService.exportFullBackup();
    exportService.downloadFile(backup, `scidigest_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const result = dbService.importFullBackup(event.target.result);
        if (result.success) {
          setData(dbService.getData());
          alert("Import successful!");
        } else {
          alert("Import failed. Invalid file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // CHANGED: Immersive styling for the reader mode
  const mainPadding = currentTab === 'reader' ? 'p-0' : 'p-8';
  const contentWidth = currentTab === 'reader' ? 'max-w-none' : 'max-w-6xl mx-auto pb-20';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-inter">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        onOpenFeedback={() => setShowFeedback(true)} 
        syncStatus={syncStatus} 
      />
      
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      
      {showManualAdd && (
        <ManualAddModal 
          onClose={() => setShowManualAdd(false)}
          onAdd={(a) => setData(dbService.addArticle(a))}
          existingInterests={interests}
          onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }}
        />
      )}

      {showSynthesisModal && (
        <SynthesisModal 
          articles={data.articles.filter(a => selectedArticleIds.includes(a.id))} 
          notes={data.notes.filter(n => n.articleIds.some(aid => selectedArticleIds.includes(aid)))} 
          onClose={() => setShowSynthesisModal(false)} 
        />
      )}
      
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <h3 className="text-2xl font-bold text-white">Quota Recovery Required</h3>
            <p className="text-slate-400 text-sm">Your assistant has reached the rate limit for the free tier. To continue intensive research without delays, please select a billing-enabled API key.</p>
            <p className="text-[10px] text-slate-500">More info at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">ai.google.dev/gemini-api/docs/billing</a></p>
            <button onClick={handleOpenSelectKey} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all">Select Paid Google Key</button>
            <button onClick={() => setShowApiKeyDialog(false)} className="text-slate-500 hover:text-slate-300 text-xs font-bold">Close & Wait</button>
          </div>
        </div>
      )}

      <main className={`flex-1 ml-64 ${mainPadding} min-h-screen`}>
        <div className={`${contentWidth}`}>
          {currentTab === 'feed' && (
            <FeedMonitor 
              ratedArticles={data.articles} 
              books={data.books} 
              onAdd={(a) => setData(dbService.addArticle(a))} 
              onRead={handleOpenReader} 
              activeFeeds={feeds.filter(f => f.active)} 
              aiConfig={aiConfig}
            />
          )}

          {currentTab === 'tracker' && (
            <Tracker 
              onAdd={(a) => setData(dbService.addArticle(a))} 
              onRead={handleOpenReader} 
            />
          )}

          {currentTab === 'trending' && (
            <TrendingSection 
              interests={interests} 
              onAdd={(a) => setData(dbService.addArticle(a))} 
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
              onUpdateShelves={(sh) => setData({ ...data, shelves: sh })}
              onRead={handleOpenReader} 
              onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
              allNotes={data.notes}
            />
          )}

          {currentTab === 'reader' && activeReadingArticle && (
            <Reader 
              article={activeReadingArticle} 
              notes={data.notes} 
              onNavigateToLibrary={() => setCurrentTab('library')} 
              onUpdateNote={(id, up) => setData(dbService.updateNote(id, up))} 
              onCreateNote={(n) => setData(dbService.addNote(n))} 
              onUpdateArticle={handleUpdateArticle} 
              onAddReadTime={(id, s) => setData(dbService.addReadTime(id, s))} 
            />
          )}

          {currentTab === 'library' && (
            <div className="space-y-8">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-100">Research Library</h2>
                  <p className="text-slate-400 mt-1">Managed ingestion of scientific literature and references.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleImportGoodReads} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all">📖 GoodReads Import</button>
                  <button onClick={() => setShowManualAdd(true)} className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">📥 Add Manual</button>
                  <button onClick={handleSyncScholarArticles} disabled={isSyncingScholar} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">{isSyncingScholar ? 'Syncing...' : '🎓 Sync Scholar'}</button>
                </div>
              </header>
              {data.articles.length === 0 && data.books.length === 0 ? (
                <div className="py-24 text-center bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                  <span className="text-6xl mb-6 block">📚</span>
                  <h3 className="text-xl font-bold text-slate-300">Library Empty</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">Discover papers in the Feed, sync from GoodReads, or use Google Scholar to populate your research flight deck.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {data.articles.length > 0 && (
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Scientific Articles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.articles.map(a => (
                          <ArticleCard 
                            key={a.id} 
                            article={a} 
                            allNotes={data.notes} 
                            onUpdate={handleUpdateArticle} 
                            onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }} 
                            onRead={() => handleOpenReader(a)} 
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  
                  {data.books.length > 0 && (
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Books & References</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.books.map(b => (
                          <BookCard 
                            key={b.id} 
                            book={b} 
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {currentTab === 'notes' && (
            <NotesSection 
              notes={data.notes} 
              articles={data.articles} 
              activeNoteId={activeNoteId} 
              setActiveNoteId={setActiveNoteId} 
              onUpdate={(id, up) => setData(dbService.updateNote(id, up))} 
              onCreate={() => {
                const newNote: Note = { 
                  id: Math.random().toString(36).substr(2, 9), 
                  title: 'Untitled Note', 
                  content: '', 
                  articleIds: [], 
                  lastEdited: new Date().toISOString() 
                };
                dbService.addNote(newNote);
                setActiveNoteId(newNote.id);
                window.dispatchEvent(new CustomEvent('db-update'));
              }} 
              onDelete={(id) => {
                dbService.deleteNote(id);
                setActiveNoteId(null);
                window.dispatchEvent(new CustomEvent('db-update'));
              }} 
              onNavigateToArticle={handleOpenReaderById}
              onNavigateToNetwork={(nid) => { setNetworkFocusId(nid); setCurrentTab('networks'); }} 
            />
          )}

          {currentTab === 'academy' && (
            <Academy 
              articles={data.articles} 
              totalReadTime={data.totalReadTime} 
              onNavigate={setCurrentTab} 
              onRead={handleOpenReader} 
            />
          )}

          {currentTab === 'networks' && (
            <NetworkGraph 
              articles={data.articles} 
              notes={data.notes} 
              books={data.books} 
              focusNodeId={networkFocusId} 
              onClearFocus={() => setNetworkFocusId(null)} 
              onUpdateArticle={handleUpdateArticle} 
              onNavigateToArticle={handleOpenReaderById}
              onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
            />
          )}

          {currentTab === 'topics' && (
            <InterestsManager 
              interests={interests} 
              onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} 
              socialProfiles={data.socialProfiles} 
              onUpdateSocialProfiles={handleUpdateSocialProfiles} 
            />
          )}

          {currentTab === 'feeds' && (
            <FeedsSection 
              feeds={feeds} 
              onUpdateFeeds={(f) => { setFeeds(f); dbService.saveFeeds(f); }} 
            />
          )}

          {currentTab === 'settings' && (
            <SettingsSection 
              aiConfig={aiConfig} 
              onUpdateAIConfig={(c) => { setAIConfig(c); dbService.saveAIConfig(c); }} 
              interests={interests} 
              onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} 
              socialProfiles={data.socialProfiles} 
              onUpdateSocialProfiles={handleUpdateSocialProfiles} 
            />
          )}

          {currentTab === 'portability' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <header>
                <h2 className="text-3xl font-bold text-white">Data Portability & Privacy</h2>
                <p className="text-slate-400">Manage your research trajectory backups and cloud synchronization.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                  <h3 className="text-xl font-bold">Local Backup</h3>
                  <p className="text-sm text-slate-500">Download a full JSON backup of your library, notes, and research trajectories.</p>
                  <div className="flex gap-3">
                    <button onClick={handleExportData} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold">Export Backup</button>
                    <button onClick={handleImportData} className="bg-slate-800 text-slate-300 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700">Import Backup</button>
                  </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                  <h3 className="text-xl font-bold">Cloud Sync</h3>
                  <p className="text-sm text-slate-500">Connect to Google Drive to enable encrypted synchronization across your devices.</p>
                  <div className="flex gap-3">
                    <button onClick={() => cloudSyncService.signIn((s) => s && setSyncStatus('synced'))} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold">Sign In</button>
                    <button onClick={() => { cloudSyncService.signOut(); setSyncStatus('disconnected'); }} className="bg-slate-800 text-slate-300 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700">Sign Out</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'version' && <VersionSection />}
          {currentTab === 'logs' && <LogSection logs={data.logs} onClear={() => dbService.clearLogs()} />}
          {currentTab === 'guide' && <GuideSection />}
        </div>
      </main>
    </div>
  );
};

// Add missing default export
export default App;
