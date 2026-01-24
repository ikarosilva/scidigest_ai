
import React, { useState } from 'react';
import { dbService, APP_VERSION } from '../services/dbService';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const count = dbService.getMonthlyFeedbackCount();
  const isLimitReached = count >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) return;

    // Use a placeholder URL or the user's specific repo if known
    const repoUrl = "https://github.com/user/scidigest-ai/issues/new"; 
    const label = type === 'bug' ? 'bug' : 'enhancement';
    
    // Prefix the version to the title for easy triage
    const prefixedTitle = `[v${APP_VERSION}] ${title}`;
    
    const body = encodeURIComponent(`
### ${type === 'bug' ? 'Bug Description' : 'Feature Request'}
${description}

---
**Application Version**: ${APP_VERSION}
**Platform**: Browser (Web)
*Submitted via SciDigest AI Feedback Tool*
    `);
    
    const finalUrl = `${repoUrl}?title=${encodeURIComponent(prefixedTitle)}&labels=${label}&body=${body}`;
    
    // Track locally
    dbService.trackFeedbackSubmission();
    
    // Redirect to GitHub
    window.open(finalUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Submit Issues</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">SciDigest AI v{APP_VERSION}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              type="button"
              onClick={() => setType('bug')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'bug' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🐞 Report Bug
            </button>
            <button 
              type="button"
              onClick={() => setType('feature')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'feature' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              ✨ Request Feature
            </button>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-widest">Issue Title</label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'bug' ? "What went wrong?" : "What would you like to see?"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-widest">Detailed Context</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' ? "Steps to reproduce, expected behavior, etc." : "Why is this feature useful? How should it work?"}
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-xs text-indigo-300">
              {isLimitReached 
                ? "Monthly limit reached (5/5). Try again next month." 
                : `Usage: ${count} of 5 submissions used this month.`}
            </p>
            {!isLimitReached && (
               <div className="flex gap-1">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < count ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                 ))}
               </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isLimitReached}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <span>🚀</span> Open GitHub Issue
          </button>
          
          <p className="text-[10px] text-center text-slate-500">
            Submitting for <strong>v{APP_VERSION}</strong>. You will be redirected to GitHub to finalize the post.
          </p>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
