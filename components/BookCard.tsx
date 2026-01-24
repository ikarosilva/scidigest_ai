
import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-amber-500/5 transition-all group/card border-l-4 ${book.isInQueue ? 'border-l-amber-500' : 'border-l-indigo-500/50'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`${book.amazonUrl ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'} text-[10px] font-bold px-2 py-1 rounded uppercase`}>
            {book.amazonUrl ? 'Amazon Ingestion' : 'Reference Book'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {book.isInQueue ? 'Queued Analysis' : `Added ${new Date(book.dateAdded).toLocaleDateString()}`}
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

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
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
  );
};

export default BookCard;
