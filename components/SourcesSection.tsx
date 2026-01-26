
import React, { useState } from 'react';
import { SocialProfiles, Feed } from '../types';
import InterestsManager from './InterestsManager';
import FeedsSection from './FeedsSection';

interface SourcesSectionProps {
  interests: string[];
  onUpdateInterests: (interests: string[]) => void;
  socialProfiles: SocialProfiles;
  onUpdateSocialProfiles: (profiles: SocialProfiles) => void;
  feeds: Feed[];
  onUpdateFeeds: (feeds: Feed[]) => void;
}

const SourcesSection: React.FC<SourcesSectionProps> = ({
  interests,
  onUpdateInterests,
  socialProfiles,
  onUpdateSocialProfiles,
  feeds,
  onUpdateFeeds
}) => {
  const [activeTab, setActiveTab] = useState<'topics' | 'feeds'>('topics');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>⚙️</span> Research Configuration
          </h2>
          <p className="text-slate-400 mt-1">Manage your intellectual footprint and information ingestion sources.</p>
        </div>
        
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl flex">
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              activeTab === 'topics' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>🎯</span> Topics & Identity
          </button>
          <button
            onClick={() => setActiveTab('feeds')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              activeTab === 'feeds' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>📡</span> Monitoring Feeds
          </button>
        </div>
      </header>

      <div className="relative">
        {activeTab === 'topics' ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <InterestsManager 
              interests={interests} 
              onUpdateInterests={onUpdateInterests} 
              socialProfiles={socialProfiles} 
              onUpdateSocialProfiles={onUpdateSocialProfiles} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <FeedsSection 
              feeds={feeds} 
              onUpdateFeeds={onUpdateFeeds} 
            />
          </div>
        )}
      </div>

      <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
          Configuration is stored locally & encrypted for cloud synchronization.
        </p>
      </footer>
    </div>
  );
};

export default SourcesSection;
