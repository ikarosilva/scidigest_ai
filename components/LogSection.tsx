import React, { useState } from 'react';
import { LogEntry } from '../types';
import { dbService, APP_VERSION } from '../services/dbService';
import { exportService } from '../services/exportService';

interface LogSectionProps {
  logs: LogEntry[];
  onClear: () => void;
}

const LogSection: React.FC<LogSectionProps> = ({ logs, onClear }) => {
  const [expandedContextIndex, setExpandedContextIndex] = useState<number | null>(null);

  const handleDownload = () => {
    const header = `SciDigest AI System Logs\nVersion: ${APP_VERSION}\nExported: ${new Date().toLocaleString()}\n------------------------------------------------\n\n`;
    const body = logs.map(l => `[${l.date}] [${l.type.toUpperCase()}] [v${l.version}] ${l.message} ${l.context ? `\nContext: ${JSON.stringify(l.context, null, 2)}` : ''}`).join('\n\n');
    exportService.downloadFile(header + body, `scidigest_logs_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
  };

  const handleCopyForAnalysis = () => {
    const isDebugActive = dbService.getAIConfig().debugMode;
    const header = `--- SCI-DIGEST SYSTEM LOG DATA [v${APP_VERSION}] ---\n`;
    const meta = `METADATA: Exported=${new Date().toISOString()} | DebugMode=${isDebugActive} | BufferSize=${logs.length}\n\n`;
    
    const body = logs.map(l => {
      const timestamp = new Date(l.date).toLocaleTimeString();
      const contextStr = l.context ? ` | CTX: ${JSON.stringify(l.context)}` : '';
      return `[${l.type.toUpperCase()}] [${timestamp}] ${l.message}${contextStr}`;
    }).join('\n');
    
    const footer = `\n\n--- END OF LOG DATA ---`;
    
    const fullPayload = header + meta + body + footer;
    
    navigator.clipboard.writeText(fullPayload).then(() => {
      alert("Diagnostic payload wrapped with AI signatures and copied to clipboard.");
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>📝</span> System Logs
          </h2>
          <p className="text-slate-400 mt-1">Diagnostic buffer for scientific assistant triage.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCopyForAnalysis}
            disabled={logs.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            📋 Copy for AI Analysis
          </button>
          <button 
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-slate-700 disabled:opacity-50"
          >
            Download .txt
          </button>
          <button 
            onClick={onClear}
            disabled={logs.length === 0}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
          >
            Clear Buffer
          </button>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Circular Buffer Utilization</span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold">{logs.length} / 100 Entries</span>
           </div>
           {dbService.getAIConfig().debugMode && (
             <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 animate-pulse">DEBUG MODE ACTIVE</span>
           )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-slate-950/30 text-slate-500 border-b border-slate-800/50">
                <th className="px-6 py-4 font-bold uppercase tracking-tighter">Timestamp</th>
                <th className="px-6 py-4 font-bold uppercase tracking-tighter">Type</th>
                <th className="px-6 py-4 font-bold uppercase tracking-tighter">Message</th>
                <th className="px-6 py-4 font-bold uppercase tracking-tighter text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <React.Fragment key={i}>
                  <tr className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{new Date(log.date).toLocaleTimeString()}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        log.type === 'error' ? 'bg-red-500/20 text-red-400' : 
                        log.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
                        log.type === 'debug' ? 'bg-indigo-500/40 text-indigo-200 border border-indigo-500/30' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className={`px-6 py-3 leading-relaxed ${log.type === 'error' ? 'text-red-300' : 'text-slate-300'}`}>
                      {log.message}
                    </td>
                    <td className="px-6 py-3 text-right">
                       {log.context && (
                         <button 
                           onClick={() => setExpandedContextIndex(expandedContextIndex === i ? null : i)}
                           className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest"
                         >
                           {expandedContextIndex === i ? 'Hide' : 'Context'}
                         </button>
                       )}
                    </td>
                  </tr>
                  {expandedContextIndex === i && log.context && (
                    <tr className="bg-slate-950/80">
                      <td colSpan={5} className="px-8 py-6">
                         <div className="bg-black/50 p-4 rounded-xl border border-slate-800 overflow-x-auto max-w-4xl">
                            <pre className="text-[10px] text-indigo-300/80 leading-relaxed">
                               {JSON.stringify(log.context, null, 2)}
                            </pre>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">
                    Buffer empty. System diagnostics are stable.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <footer className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
        <div className="flex items-start gap-4">
          <div className="text-2xl opacity-50">🛡️</div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnostic Policy</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              Logs are stored locally in a circular buffer (100 events). 
              The buffer is automatically purged on application version updates (v{APP_VERSION}) or system resets.
              Use the "Copy for AI Analysis" tool to provide technical context for bug fixes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LogSection;