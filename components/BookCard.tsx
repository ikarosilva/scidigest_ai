
import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-amber-500/5 transition-all group/card border-l-4 border-l-amber-500/50">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded uppercase">
            Book
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            Added {new Date(book.dateAdded).toLocaleDateString()}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">GoodReads Rating</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-amber-400">{book.rating}</span>
            <span className="text-xs text-slate-500">/5</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-100 leading-tight mb-1">
        {book.title}
      </h3>
      <p className="text-xs text-slate-400 mb-4 flex items-center gap-2">
        <span className="opacity-50">by</span> {book.author}
      </p>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
        <div className="flex items-center gap-1.5 text-amber-500/60">
          <span className="text-lg">📚</span>
          <span className="text-[10px] uppercase font-black tracking-widest">Scientific Ingestion</span>
        </div>
        <button 
          onClick={() => window.open(`https://www.google.com/search?q=book+${encodeURIComponent(book.title)}+${encodeURIComponent(book.author)}`, '_blank')}
          className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors font-bold uppercase"
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default BookCard;
