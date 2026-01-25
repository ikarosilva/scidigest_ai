
import React, { useState } from 'react';
import { Book, Shelf } from '../types';
import { dbService } from '../services/dbService';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const [showShelfMenu, setShowShelfMenu] = useState(false);
  const shelves = dbService.getData().shelves;
  const interests = dbService.getInterests();

  // Filter tags to find ones that match global interests
  const matchedInterests = (book.tags || []).filter(tag => 
    interests.some(interest => tag.toLowerCase() === interest.toLowerCase())
  );

  const toggleShelf = (shelfId: string) => {
    const isCurrentlyIn = book.shelfIds?.includes(shelfId);
    let newShelfIds = book.shelfIds || [];
    if (isCurrentlyIn) {
      newShelfIds = newShelfIds.filter(id => id !== shelfId);
    } else {
      newShelfIds = [...newShelfIds, shelfId];
    }
    dbService.updateBook(book.id, { shelfIds: newShelfIds });
    // Trigger force refresh for sibling components if needed via global signal or reload
    // For this context we assume App handles data sync
    window.dispatchEvent(new CustomEvent('db-update'));
  };

  const activeShelvesCount = book.shelfIds?.length || 0;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-amber-500/5 transition-all group/card border-l-4 ${activeShelvesCount > 0 ? 'border-l-amber-500' : 'border-l-indigo-500/50'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`${book.amazonUrl ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'} text-[10px] font-bold px-2 py-1 rounded uppercase`}>
            {book.amazonUrl ? 'Amazon Ingestion' : 'Reference Book'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {activeShelvesCount > 0 ? 'On Shelves' : `Added ${new Date(book.dateAdded).toLocaleDateString()}`}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Community Rating</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-amber-400">★ {book.rating}</span>
            <span className="text-xs text-slate-500">/5</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-100 leading-tight mb-1">
        {book.title}
      </h3>
      <p className="text-xs text-slate-400 mb-2 flex items-center gap-2">
        <span className="opacity-50">by</span> {book.author}
      </p>

      {/* Matching Topics (Interests) */}
      {matchedInterests.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {matchedInterests.map(topic => (
            <span key={topic} className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 bg-amber-500/10 flex items-center gap-1.5 shadow-lg shadow-amber-500/5">
              <span className="text-[10px]">🎯</span>
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Shelf Badges */}
      {activeShelvesCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
           {book.shelfIds.map(sid => {
             const s = shelves.find(sh => sh.id === sid);
             return s ? (
               <span key={sid} className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-slate-700/50 text-slate-500 flex items-center gap-1.5 bg-slate-950/50">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                  {s.name}
               </span>
             ) : null;
           })}
        </div>
      )}

      {book.description && (
        <p className="text-[11px] text-slate-500 line-clamp-2 italic mb-4 leading-relaxed">
          "{book.description}"
        </p>
      )}

      {book.price && (
        <div className="bg-slate-950/50 rounded-lg p-2 mb-4 border border-slate-800/50">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-600">Market Price</span>
            <span className="text-xs font-black text-emerald-400">{book.price}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-800/50 relative">
        <button 
          onClick={() => setShowShelfMenu(!showShelfMenu)}
          className={`w-full text-xs font-bold py-2 rounded-lg transition-all border flex items-center justify-center gap-2 ${
            activeShelvesCount > 0 
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20' 
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-indigo-400 hover:border-indigo-500/30'
          }`}
        >
          {activeShelvesCount > 0 ? `📂 On ${activeShelvesCount} Shelves` : '📥 Add to Shelf'}
        </button>

        {showShelfMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom">
            <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Manage Literature Shelves</div>
            {shelves.map(shelf => (
              <button
                key={shelf.id}
                onClick={() => toggleShelf(shelf.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }}></div>
                   <span className="text-xs text-slate-200">{shelf.name}</span>
                </div>
                {book.shelfIds?.includes(shelf.id) && (
                  <span className="text-indigo-400 text-xs">✓</span>
                )}
              </button>
            ))}
            <button 
              onClick={() => setShowShelfMenu(false)}
              className="w-full text-[10px] text-slate-500 hover:text-white pt-2 transition-colors border-t border-slate-700 mt-1"
            >
              Done
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-500/60">
            <span className="text-lg">{book.amazonUrl ? '🛒' : '📚'}</span>
            <span className="text-[10px] uppercase font-black tracking-widest">
              {book.amazonUrl ? 'Market discovery' : 'Scientific Ingestion'}
            </span>
          </div>
          <button 
            onClick={() => window.open(book.amazonUrl || `https://www.google.com/search?q=book+${encodeURIComponent(book.title)}+${encodeURIComponent(book.author)}`, '_blank')}
            className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors font-bold uppercase"
          >
            {book.amazonUrl ? 'Open Store →' : 'View Details →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
