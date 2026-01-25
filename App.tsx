
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
  
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [networkFocusId, setNetworkFocusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'All'>('All');

  useEffect(() => {
    const handleUpdate = () => setData(dbService.getData());
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
      dbService.addLog('error', `Scholar Sync failed: ${err.message || JSON.stringify(err)}`);
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        alert("Quota exceeded for Free Tier. Please wait a minute or connect a Paid API Key for unrestricted research.");
        setShowApiKeyDialog(true);
      } else {
        alert("Failed to connect to search service. Check System Logs.");
      }
    } finally {
      setIsSyncingScholar(false);
    }
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
    setData({ ...data, socialProfiles: newProfiles });
  };

  const handleOpenReader = (article: Article) => {
    setActiveReadingArticle(article);
    setCurrentTab('reader');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-inter">
      <Sidebar currentTab={currentTab} setTab={setCurrentTab} onOpenFeedback={() => setShowFeedback(true)} syncStatus={syncStatus} />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showSynthesisModal && <SynthesisModal articles={data.articles.filter(a => selectedArticleIds.includes(a.id))} notes={data.notes.filter(n => n.articleIds.some(aid => selectedArticleIds.includes(aid)))} onClose={() => setShowSynthesisModal(false)} />}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <h3 className="text-2xl font-bold text-white">Quota Recovery Required</h3>
            <p className="text-slate-400 text-sm">Your assistant has reached the rate limit for the free tier. To continue intensive research without delays, please select a billing-enabled API key.</p>
            <button onClick={handleOpenSelectKey} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all">Select Paid Google Key</button>
            <button onClick={() => setShowApiKeyDialog(false)} className="text-slate-500 hover:text-slate-300 text-xs font-bold">Close & Wait</button>
          </div>
        </div>
      )}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'feed' && <FeedMonitor ratedArticles={data.articles} books={data.books} onAdd={(a) => setData(dbService.addArticle(a))} onRead={handleOpenReader} activeFeeds={feeds.filter(f => f.active)} aiConfig={aiConfig} />}
          {currentTab === 'academy' && <Academy articles={data.articles} totalReadTime={data.totalReadTime} onNavigate={setCurrentTab} onRead={handleOpenReader} />}
          {currentTab === 'library' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-100">Library</h2>
                <button onClick={handleSyncScholarArticles} disabled={isSyncingScholar} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isSyncingScholar ? 'Syncing...' : '🎓 Sync Scholar'}</button>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.articles.map(a => <ArticleCard key={a.id} article={a} allNotes={data.notes} onUpdate={handleUpdateArticle} onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }} onRead={() => handleOpenReader(a)} />)}
              </div>
            </div>
          )}
          {currentTab === 'reader' && activeReadingArticle && <Reader article={activeReadingArticle} notes={data.notes} onNavigateToLibrary={() => setCurrentTab('library')} onUpdateNote={(id, up) => setData(dbService.updateNote(id, up))} onCreateNote={(n) => setData(dbService.addNote(n))} onUpdateArticle={handleUpdateArticle} onAddReadTime={(id, s) => setData(dbService.addReadTime(id, s))} />}
          {currentTab === 'topics' && <div className="space-y-6"><h2 className="text-3xl font-bold">Topics</h2><InterestsManager interests={interests} onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} socialProfiles={data.socialProfiles} onUpdateSocialProfiles={handleUpdateSocialProfiles} /></div>}
          {currentTab === 'settings' && <SettingsSection aiConfig={aiConfig} onUpdateAIConfig={(c) => { setAIConfig(c); dbService.saveAIConfig(c); }} interests={interests} onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} socialProfiles={data.socialProfiles} onUpdateSocialProfiles={handleUpdateSocialProfiles} />}
          {currentTab === 'logs' && <LogSection logs={data.logs} onClear={() => { dbService.clearLogs(); setData(dbService.getData()); }} />}
        </div>
      </main>
    </div>
  );
};

export default App;
