
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Academy from './components/Academy';
import FeedMonitor from './components/FeedMonitor';
import Tracker from './components/Tracker';
import LibrarySection from './components/LibrarySection';
import TrendingSection from './components/TrendingSection';
import NotesSection from './components/NotesSection';
import SettingsSection from './components/SettingsSection';
import NetworkGraph from './components/NetworkGraph';
import Reader from './components/Reader';
import FeedbackModal from './components/FeedbackModal';
import SynthesisModal from './components/SynthesisModal';
import VersionSection from './components/VersionSection';
import LogSection from './components/LogSection';
import ManualAddModal from './components/ManualAddModal';
import SourcesSection from './components/SourcesSection';
import TelemetrySection from './components/TelemetrySection';
import { dbService, APP_VERSION } from './services/dbService';
import { cloudSyncService } from './services/cloudSyncService';
import { geminiService } from './services/geminiService';
import { academicApiService } from './services/academicApiService';
import { Article, Book, Note, SyncStatus, Feed, AIConfig, AppState, SocialProfiles, FeedSourceType } from './types';
import { pdfStorageService } from './services/pdfStorageService';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('feed');
  const [data, setData] = useState<AppState>(dbService.getData());
  const [interests, setInterests] = useState<string[]>(dbService.getInterests());
  const [feeds, setFeeds] = useState<Feed[]>(dbService.getFeeds());
  const [aiConfig, setAIConfig] = useState<AIConfig>(dbService.getAIConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [activeReadingArticle, setActiveReadingArticle] = useState<Article | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [networkFocusId, setNetworkFocusId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Lifted Network State
  const [authorNetworkData, setAuthorNetworkData] = useState<any>(null);
  const [isSyncingScholar, setIsSyncingScholar] = useState(false);

  useEffect(() => {
    // One-time bootstrap: add built-in PDF user guide for first-time users (and Reader smoke test).
    // Guard against React StrictMode double-invocation in dev.
    let cancelled = false;
    const bootstrapKey = 'scidigest_bootstrap_userguide';
    const guideAssetVersion = 'v2'; // bump when public/UsergGuide.pdf changes

    (async () => {
      try {
        const bootstrappedVersion = localStorage.getItem(bootstrapKey);
        const existingData = dbService.getData();
        const existing = existingData.articles.find(a => a.id === 'user-guide' || a.pdfStorageId === 'builtin-userguide-v1');
        // If we already bootstrapped the current guide version, nothing to do.
        if (bootstrappedVersion === guideAssetVersion && existing) return;

        const res = await fetch('/UsergGuide.pdf');
        if (!res.ok) throw new Error(`Failed to fetch UsergGuide.pdf: HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;

        // Always overwrite the stored blob for the current version.
        await pdfStorageService.putPdf({ id: 'builtin-userguide-v1', blob, name: 'UsergGuide.pdf' });
        if (cancelled) return;

        // Ensure a Library entry exists; if it already exists, update it in-place.
        const guideId = existing?.id || 'user-guide';
        const guideArticle: Article = existing
          ? {
              ...existing,
              id: guideId,
              pdfStorageId: 'builtin-userguide-v1',
              // Always keep a direct URL so PDFs render even if IndexedDB or blob URLs misbehave on some mobile browsers.
              pdfUrl: '/UsergGuide.pdf',
              title: existing.title || 'SciDigest AI — User Guide',
              isBookmarked: existing.isBookmarked ?? true,
              shelfIds: existing.shelfIds?.length ? existing.shelfIds : ['default-queue']
            }
          : {
              id: guideId,
              title: 'SciDigest AI — User Guide',
              authors: ['SciDigest AI'],
              abstract: 'A built-in quickstart PDF. Use this to validate that the Reader can render uploaded PDFs.',
              date: new Date().toISOString(),
              year: new Date().getFullYear().toString(),
              source: FeedSourceType.MANUAL,
              rating: 0,
              pdfStorageId: 'builtin-userguide-v1',
              pdfUrl: '/UsergGuide.pdf',
              tags: ['User Guide', 'Onboarding'],
              isBookmarked: true,
              notes: '',
              noteIds: [],
              userReadTime: 0,
              shelfIds: ['default-queue'],
              userReviews: {
                sentiment: 'Unknown',
                summary: 'Built-in onboarding guide.',
                citationCount: 0
              }
            };

        const next = existing
          ? dbService.updateArticle(guideId, guideArticle)
          : dbService.addArticle(guideArticle);
        setData({ ...next });
        localStorage.setItem(bootstrapKey, guideAssetVersion);
      } catch (e: any) {
        // Never block app load on onboarding asset.
        dbService.addLog('warning', `User guide bootstrap skipped: ${e?.message || String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSyncScholar = async () => {
    let scholarUrl = data.socialProfiles.googleScholar;
    
    if (!scholarUrl) {
      scholarUrl = prompt("Please enter your Google Scholar Profile URL (e.g. https://scholar.google.com/citations?user=...):") || "";
      if (!scholarUrl) return;
      
      const newProfiles = { ...data.socialProfiles, googleScholar: scholarUrl };
      dbService.saveSocialProfiles(newProfiles);
      setData({ ...data, socialProfiles: newProfiles });
    }

    setIsSyncingScholar(true);
    try {
      const papers = await academicApiService.fetchAuthorPapers(scholarUrl);
      
      if (papers.length === 0) {
        alert("No articles discovered on the provided Scholar profile. Ensure the URL is public and correct.");
        setIsSyncingScholar(false);
        return;
      }

      const existingTitles = new Set(data.articles.map(a => a.title.toLowerCase()));
      let newCount = 0;
      let finalData = data;

      for (const p of papers) {
        if (!existingTitles.has(p.title.toLowerCase())) {
          const matchedTopics = interests.filter(topic => 
            p.title.toLowerCase().includes(topic.toLowerCase()) || 
            (p.snippet && p.snippet.toLowerCase().includes(topic.toLowerCase()))
          );

          const newArticle: Article = {
            id: Math.random().toString(36).substr(2, 9),
            title: p.title,
            authors: p.authors,
            abstract: p.snippet,
            date: `${p.year}-01-01`,
            year: p.year,
            source: FeedSourceType.GOOGLE_SCHOLAR,
            rating: 5,
            tags: matchedTopics.length > 0 ? matchedTopics : ['Scholar Import'],
            isBookmarked: false,
            notes: 'Auto-ingested via Scholar sync.',
            noteIds: [],
            userReadTime: 0,
            shelfIds: ['default-queue'],
            userReviews: {
              sentiment: 'Unknown',
              summary: 'Sync discovery hit.',
              citationCount: p.citationCount || 0,
              citedByUrl: p.scholarUrl
            }
          };

          finalData = dbService.addArticle(newArticle);
          newCount++;
        }
      }

      setData({ ...dbService.getData() });

      if (newCount > 0) {
        alert(`Scholar Sync Complete: Ingested ${newCount} new articles into your library and mapped them to your research topics.`);
      } else {
        alert("Your library is already in sync with your Google Scholar profile.");
      }

      const network = await geminiService.discoverAuthorNetwork(data.socialProfiles);
      if (network && network.nodes && network.nodes.length > 0) {
        setAuthorNetworkData(network);
      }

    } catch (err) {
      console.error(err);
      alert("Error building research network or fetching papers.");
    } finally {
      setIsSyncingScholar(false);
    }
  };

  const mainPadding = currentTab === 'reader' ? 'p-0' : 'p-8';
  const contentWidth = currentTab === 'reader' ? 'max-w-none' : 'max-w-6xl mx-auto pb-20';
  const sidebarMargin = isSidebarCollapsed ? 'ml-20' : 'ml-64';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-inter">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        onOpenFeedback={() => setShowFeedback(true)} 
        syncStatus={syncStatus}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
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
      
      <main className={`flex-1 ${sidebarMargin} ${mainPadding} min-h-screen transition-all duration-300`}>
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
              activeRssFeeds={feeds.filter(f => f.active)}
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

          {currentTab === 'reader' && activeReadingArticle && (
            <Reader 
              article={activeReadingArticle} 
              notes={data.notes} 
              onNavigateToLibrary={() => setCurrentTab('library')} 
              onUpdateNote={(id, up) => setData(dbService.updateNote(id, up))} 
              onCreateNote={(n) => setData(dbService.addNote(n))} 
              onUpdateArticle={handleUpdateArticle} 
              onAddArticle={(a) => setData(dbService.addArticle(a))}
              onAddReadTime={(id, s) => setData(dbService.addReadTime(id, s))} 
            />
          )}

          {currentTab === 'library' && (
            <LibrarySection 
              articles={data.articles} 
              books={data.books} 
              shelves={data.shelves} 
              notes={data.notes} 
              interests={interests}
              onUpdateArticle={handleUpdateArticle} 
              onUpdateBook={handleUpdateBook}
              onUpdateShelves={(sh) => setData({ ...data, shelves: sh })}
              onRead={handleOpenReader} 
              onNavigateToNote={(nid) => { setActiveNoteId(nid); setCurrentTab('notes'); }}
              onSyncScholar={handleSyncScholar}
              onShowManualAdd={() => setShowManualAdd(true)}
            />
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
              onNavigateToNote={(nid) => { setNetworkFocusId(nid); setCurrentTab('notes'); }}
              authorNetworkData={authorNetworkData}
              onSyncScholar={handleSyncScholar}
              isSyncingScholar={isSyncingScholar}
            />
          )}

          {currentTab === 'telemetry' && (
            <TelemetrySection aiConfig={aiConfig} />
          )}

          {currentTab === 'sources' && (
            <SourcesSection 
              interests={interests} 
              onUpdateInterests={(ni) => { setInterests(ni); dbService.saveInterests(ni); }} 
              socialProfiles={data.socialProfiles} 
              onUpdateSocialProfiles={handleUpdateSocialProfiles} 
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
              syncStatus={syncStatus}
            />
          )}

          {currentTab === 'version' && <VersionSection />}
          {currentTab === 'logs' && <LogSection logs={data.logs} onClear={() => dbService.clearLogs()} />}
        </div>
      </main>
    </div>
  );
};

export default App;
