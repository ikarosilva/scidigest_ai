
import React, { useState, useMemo } from 'react';
import { Article, Book, Shelf, Note, FeedSourceType } from '../types';
import ArticleCard from './ArticleCard';
import BookCard from './BookCard';
import { dbService } from '../services/dbService';
import { exportService } from '../services/exportService';

interface LibrarySectionProps {
  articles: Article[];
  books: Book[];
  shelves: Shelf[];
  notes: Note[];
  interests: string[];
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  onUpdateShelves: (shelves: Shelf[]) => void;
  onRead: (article: Article) => void;
  onNavigateToNote: (noteId: string) => void;
  onSyncScholar: () => void;
  onShowManualAdd: () => void;
}

const LibrarySection: React.FC<LibrarySectionProps> = ({ 
  articles, 
  books, 
  shelves,
  notes,
  interests,
  onUpdateArticle, 
  onUpdateBook,
  onUpdateShelves,
  onRead, 
  onNavigateToNote,
  onSyncScholar,
  onShowManualAdd
}) => {
  const [activeShelfId, setActiveShelfId] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [isSyncingNotebook, setIsSyncingNotebook] = useState(false);

  // Virtual shelf logic
  const filteredItems = useMemo(() => {
    let paperItems: any[] = [];
    let bookItems: any[] = [];

    if (activeShelfId === 'all') {
      paperItems = articles.filter(a => a.rating !== -1);
      bookItems = books;
    } else if (activeShelfId === 'queue') {
      paperItems = articles.filter(a => a.shelfIds.includes('default-queue'));
      bookItems = books.filter(b => b.shelfIds.includes('default-queue'));
    } else if (activeShelfId.startsWith('topic:')) {
      const topicName = activeShelfId.replace('topic:', '').toLowerCase();
      paperItems = articles.filter(a => a.tags.some(t => t.toLowerCase() === topicName));
      bookItems = books.filter(b => b.tags?.some(t => t.toLowerCase() === topicName));
    } else {
      paperItems = articles.filter(a => a.shelfIds.includes(activeShelfId));
      bookItems = books.filter(b => b.shelfIds.includes(activeShelfId));
    }

    return [...paperItems.map(p => ({...p, itemType: 'article'})), ...bookItems.map(b => ({...b, itemType: 'book'}))]
      .sort((a: any, b: any) => {
        const dateA = a.itemType === 'article' ? a.date : a.dateAdded;
        const dateB = b.itemType === 'article' ? b.date : b.dateAdded;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [articles, books, activeShelfId]);

  const handleCreateShelf = () => {
    if (!newShelfName.trim()) return;
    const colors = ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];
    const newShelf: Shelf = {
      id: Math.random().toString(36).substr(2, 9),
      name: newShelfName,
      color: colors[shelves.length % colors.length],
      createdAt: new Date().toISOString()
    };
    const updated = dbService.addShelf(newShelf);
    onUpdateShelves(updated.shelves);
    setActiveShelfId(newShelf.id);
    setNewShelfName('');
    setIsCreating(false);
  };

  const handleDeleteShelf = (id: string) => {
    if (confirm(`Delete shelf "${shelves.find(s => s.id === id)?.name}"?`)) {
      const updated = dbService.deleteShelf(id);
      onUpdateShelves(updated.shelves);
      setActiveShelfId('all');
    }
  };

  const handleGoodReadsImport = () => {
    const url = prompt("Enter GoodReads RSS or Profile URL for technical bookshelf ingestion:");
    if (url) {
      alert("GoodReads ingestion protocol initiated. AI will prioritize technical monographs matching your trajectories.");
      // Simulated add
      const mockBook: Book = {
        id: 'gr-' + Math.random().toString(36).substr(2, 5),
        title: "Structure and Interpretation of Computer Programs",
        author: "Abelson & Sussman",
        rating: 5,
        dateAdded: new Date().toISOString(),
        shelfIds: ['default-queue'],
        tags: ['CS Fundamentals'],
        description: "Imported via GoodReads metadata service."
      };
      dbService.addBooks([mockBook]);
      window.dispatchEvent(new CustomEvent('db-update'));
    }
  };

  const handleSyncToNotebookLM = () => {
    setIsSyncingNotebook(true);
    const content = `SHELF EXPORT: ${activeShelfId}\n\n` + 
      filteredItems.map((p: any) => `PAPER: ${p.title}\nAUTHORS: ${p.authors || p.author}\nABSTRACT: ${p.abstract || p.description}\nNOTES: ${p.notes || ''}\n---\n`).join('\n');
    
    exportService.downloadFile(content, `SciDigest_Export_${activeShelfId}.txt`, 'text/plain');
    
    setTimeout(() => {
      setIsSyncingNotebook(false);
      if (confirm("Shelf summary downloaded. Open NotebookLM?")) {
        window.open('https://notebooklm.google.com/', '_blank');
      }
    }, 800);
  };

  const handleSyncToPerplexity = () => {
    const titles = filteredItems.map((p: any) => p.title).slice(0, 10).join(', ');
    const prompt = `Perform a deep meta-analysis of the following research shelf: ${titles}. Identify shared methodologies, conflicting results in recent 2025-2026 literature, and the most cited subsequent works. Compare these works and find the most relevant current datasets.`;
    
    if (confirm(`Open Perplexity Deep Research for ${Math.min(filteredItems.length, 10)} items in this shelf?`)) {
      window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`, '_blank');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Scientific Library</h2>
          <p className="text-slate-400 mt-1">
            {activeShelfId === 'all' ? 'All research documentation.' : `Viewing: ${activeShelfId.replace('topic:', '')}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGoodReadsImport} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2">
            <span>📚</span> GoodReads
          </button>
          <button onClick={onSyncScholar} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-2">
            <span>🎓</span> Sync Scholar
          </button>
          <button onClick={onShowManualAdd} className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-2">
            <span>📥</span> Add Paper
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
        {filteredItems.map((item: any) => (
          item.itemType === 'article' ? (
            <ArticleCard 
              key={item.id} 
              article={item} 
              allNotes={notes} 
              onUpdate={onUpdateArticle} 
              onNavigateToNote={onNavigateToNote} 
              onRead={() => onRead(item)} 
            />
          ) : (
            <BookCard key={item.id} book={item} />
          )
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-600">
             <span className="text-5xl mb-4">📚</span>
             <p className="text-lg font-medium">This shelf is currently empty.</p>
          </div>
        )}
      </div>

      {/* Bottom Floating Shelf Dock */}
      <div className="fixed bottom-8 left-72 right-8 z-[40]">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/50 p-4 rounded-[2.5rem] shadow-2xl flex items-center gap-4">
          
          {/* Main Filter & Export Column */}
          <div className="flex flex-col gap-2 px-4 border-r border-slate-800/50">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveShelfId('all')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeShelfId === 'all' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveShelfId('queue')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeShelfId === 'queue' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Queue
              </button>
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mr-1">Export Shelf</span>
              <button 
                onClick={handleSyncToPerplexity} 
                title="Meta-analyze shelf with Perplexity Deep Research"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all text-xs"
              >
                🌐
              </button>
              <button 
                onClick={handleSyncToNotebookLM} 
                disabled={isSyncingNotebook}
                title="Deep dive shelf with NotebookLM"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all text-xs disabled:opacity-50"
              >
                {isSyncingNotebook ? '...' : '🧬'}
              </button>
            </div>
          </div>

          {/* Shelves Column */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 px-2">
            {/* Custom DB Shelves */}
            {shelves.filter(s => s.id !== 'default-queue').map(shelf => (
              <div key={shelf.id} className="relative group shrink-0">
                <button
                  onClick={() => setActiveShelfId(shelf.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 border ${
                    activeShelfId === shelf.id 
                    ? 'bg-slate-800 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }}></div>
                  {shelf.name}
                </button>
                {activeShelfId === shelf.id && (
                  <button 
                    onClick={() => handleDeleteShelf(shelf.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                )}
              </div>
            ))}

            {/* Topic Shelves (Dynamic) */}
            <div className="w-px h-6 bg-slate-800 mx-2 shrink-0"></div>
            {interests.map(topic => (
              <button
                key={topic}
                onClick={() => setActiveShelfId(`topic:${topic}`)}
                className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-bold transition-all border ${
                  activeShelfId === `topic:${topic}` 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                  : 'bg-slate-950/50 border-slate-800 text-slate-600 hover:text-slate-400'
                }`}
              >
                🎯 {topic}
              </button>
            ))}
          </div>

          {/* Add Shelf Column */}
          <div className="flex items-center gap-2 px-4 border-l border-slate-800/50">
             {isCreating ? (
               <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                 <input 
                   autoFocus
                   value={newShelfName}
                   onChange={(e) => setNewShelfName(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleCreateShelf()}
                   placeholder="Name..."
                   className="bg-slate-950 border border-slate-800 rounded-full px-4 py-1.5 text-[10px] text-white outline-none w-32"
                 />
                 <button onClick={handleCreateShelf} className="text-emerald-500 text-lg">✓</button>
                 <button onClick={() => setIsCreating(false)} className="text-slate-500 text-lg">✕</button>
               </div>
             ) : (
               <button 
                 onClick={() => setIsCreating(true)}
                 className="text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors"
               >
                 + New Shelf
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibrarySection;
