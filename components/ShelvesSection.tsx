
import React, { useState, useMemo } from 'react';
import { Article, Book, Shelf } from '../types';
import ArticleCard from './ArticleCard';
import BookCard from './BookCard';
import { dbService } from '../services/dbService';
import { exportService } from '../services/exportService';

interface ShelvesSectionProps {
  articles: Article[];
  books: Book[];
  shelves: Shelf[];
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => void;
  onUpdateShelves: (shelves: Shelf[]) => void;
  onRead: (article: Article) => void;
  onNavigateToNote: (noteId: string) => void;
  allNotes: any[];
}

const ShelvesSection: React.FC<ShelvesSectionProps> = ({ 
  articles, 
  books, 
  shelves,
  onUpdateArticle, 
  onUpdateBook,
  onUpdateShelves,
  onRead, 
  onNavigateToNote, 
  allNotes 
}) => {
  const [activeShelfId, setActiveShelfId] = useState<string>('default-queue');
  const [isCreating, setIsCreating] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [isSyncingNotebook, setIsSyncingNotebook] = useState(false);

  const activeShelf = useMemo(() => shelves.find(s => s.id === activeShelfId) || shelves[0], [shelves, activeShelfId]);

  const shelfItems = useMemo(() => {
    const paperItems = articles.filter(a => a.shelfIds.includes(activeShelfId)).map(a => ({ ...a, itemType: 'article' as const }));
    const bookItems = books.filter(b => b.shelfIds.includes(activeShelfId)).map(b => ({ ...b, itemType: 'book' as const }));
    return [...paperItems, ...bookItems].sort((a, b) => {
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
    if (id === 'default-queue') return;
    if (confirm(`Delete shelf "${shelves.find(s => s.id === id)?.name}"? Items will be removed from this shelf but stay in your library.`)) {
      const updated = dbService.deleteShelf(id);
      onUpdateShelves(updated.shelves);
      setActiveShelfId('default-queue');
    }
  };

  const handleSyncToNotebookLM = () => {
    setIsSyncingNotebook(true);
    // CONSTRUCTION: Export shelf articles to a specialized JSON bundle
    // NotebookLM currently works best with raw PDFs or text in Google Drive.
    // We will generate a structured summary document for immediate import.
    const papers = articles.filter(a => a.shelfIds.includes(activeShelfId));
    const content = `SHELF ANALYSIS: ${activeShelf.name}\n\n` + 
      papers.map(p => `PAPER: ${p.title}\nAUTHORS: ${p.authors.join(', ')}\nABSTRACT: ${p.abstract}\nNOTES: ${p.notes}\n---\n`).join('\n');
    
    exportService.downloadFile(content, `SciDigest_NotebookLM_${activeShelf.name.replace(/\s/g, '_')}.txt`, 'text/plain');
    
    setTimeout(() => {
      setIsSyncingNotebook(false);
      if (confirm("Shelf summary downloaded. Open NotebookLM to create a study guide or deep-dive?")) {
        window.open('https://notebooklm.google.com/', '_blank');
      }
    }, 1200);
  };

  const handleRemoveFromShelf = (id: string, type: 'article' | 'book') => {
    if (type === 'article') {
      const art = articles.find(a => a.id === id);
      if (art) onUpdateArticle(id, { shelfIds: art.shelfIds.filter(sid => sid !== activeShelfId) });
    } else {
      const b = books.find(book => book.id === id);
      if (b) onUpdateBook(id, { shelfIds: b.shelfIds.filter(sid => sid !== activeShelfId) });
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-64 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
           <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Your Shelves</h3>
           <button 
             onClick={() => setIsCreating(true)}
             className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
           >
             +
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {shelves.map(shelf => (
             <button
               key={shelf.id}
               onClick={() => setActiveShelfId(shelf.id)}
               className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                 activeShelfId === shelf.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-800/50 border border-transparent'
               }`}
             >
               <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shelf.color }}></div>
                  <span className={`text-sm font-semibold truncate ${activeShelfId === shelf.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {shelf.name}
                  </span>
               </div>
               {shelf.id !== 'default-queue' && activeShelfId === shelf.id && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleDeleteShelf(shelf.id); }}
                   className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs"
                 >
                   ✕
                 </button>
               )}
             </button>
           ))}
        </div>

        {isCreating && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 animate-in slide-in-from-bottom-2">
            <input 
              autoFocus
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="Shelf Name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateShelf()}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleCreateShelf} className="flex-1 bg-indigo-600 text-white text-[10px] font-bold py-1.5 rounded-lg">Create</button>
              <button onClick={() => setIsCreating(false)} className="flex-1 bg-slate-800 text-slate-400 text-[10px] font-bold py-1.5 rounded-lg">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between mb-6">
           <div>
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeShelf?.color }}></div>
                 <h2 className="text-3xl font-bold text-white">{activeShelf?.name}</h2>
              </div>
              <p className="text-slate-500 text-sm mt-1">{activeShelf?.description || 'Curated research list.'}</p>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={handleSyncToNotebookLM}
                disabled={isSyncingNotebook}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold px-4 py-2 rounded-xl border border-indigo-500/20 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/5"
              >
                {isSyncingNotebook ? (
                  <>
                    <span className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
                    Preparing...
                  </>
                ) : (
                  <>✨ NotebookLM Deep Dive</>
                )}
              </button>
              <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{shelfItems.length} Items</span>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2">
           {shelfItems.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
               <span className="text-5xl mb-4">📂</span>
               <h3 className="text-lg font-bold text-slate-300">Empty Shelf</h3>
               <p className="text-sm text-slate-500 mt-2 max-w-sm">No items in this list yet. Add them from your library or feeds to begin organizing.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
               {shelfItems.map(item => (
                 <div key={item.id} className="relative group">
                   {item.itemType === 'article' ? (
                     <ArticleCard 
                        article={item as Article} 
                        onUpdate={onUpdateArticle} 
                        onRead={() => onRead(item as Article)}
                        onNavigateToNote={onNavigateToNote}
                        allNotes={allNotes}
                     />
                   ) : (
                     <BookCard book={item as Book} />
                   )}
                   <button 
                     onClick={() => handleRemoveFromShelf(item.id, item.itemType)}
                     className="absolute top-4 right-4 bg-slate-950/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100 z-10"
                     title="Remove from Shelf"
                   >
                     ✕
                   </button>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ShelvesSection;
