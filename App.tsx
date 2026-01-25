
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
import TelemetrySection from './components/TelemetrySection';
import FeedbackModal from './components/FeedbackModal';
import SynthesisModal from './components/SynthesisModal';
import InterestsManager from './components/InterestsManager';
import VersionSection from './components/VersionSection';
import LogSection from './components/LogSection';
import GuideSection from './components/GuideSection';
import ManualAddModal from './components/ManualAddModal';
import SprintSection from './components/SprintSection';
import Dashboard from './components/Dashboard';
import { dbService, APP_VERSION } from './services/dbService';
import { exportService } from './services/exportService';
import { geminiService } from './services/geminiService';
import { cloudSyncService } from './services/cloudSyncService';
import { Article, Book, Note, Sentiment, SyncStatus, Feed, AIConfig, AppState, SocialProfiles, FeedSourceType, Shelf } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');
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
      
      <main className={`flex-1 ml-64 ${mainPadding} min-h-screen`}>
        <div className={`${contentWidth}`}>
          {currentTab === 'dashboard' && (
            <Dashboard 
              articles={data.articles}
              totalReadTime={data.totalReadTime}
              onNavigate={setCurrentTab}
              onRead={handleOpenReader}
              onUpdateArticle={handleUpdateArticle}
            />
          )}

          {currentTab === 'sprint' && (
            <SprintSection 
              articles={data.articles}
              onUpdateArticle={handleUpdateArticle}
              onRead={handleOpenReader}
            />
          )}

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
                  <p className="text-slate-400 mt-1">Scientific literature management.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCurrentTab('trending')} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2">
                    <span>🎓</span> Sync Scholar
                  </button>
                  <button onClick={() => setShowManualAdd(true)} className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-2">
                    <span>📥</span> Add Paper
                  </button>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.articles.filter(a => a.rating !== -1).map(a => (
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
              }} 
              onDelete={(id) => {
                dbService.deleteNote(id);
                setActiveNoteId(null);
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

          {currentTab === 'telemetry' && (
            <TelemetrySection 
              aiConfig={aiConfig}
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

          {currentTab === 'version' && <VersionSection />}
          {currentTab === 'logs' && <LogSection logs={data.logs} onClear={() => dbService.clearLogs()} />}
          {currentTab === 'guide' && <GuideSection />}
        </div>
      </main>
    </div>
  );
};

export default App;
