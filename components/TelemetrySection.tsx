
import React, { useMemo } from 'react';
import { AIConfig, GeminiUsageEvent } from '../types';
import { dbService } from '../services/dbService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TelemetrySectionProps {
  aiConfig: AIConfig;
}

const TelemetrySection: React.FC<TelemetrySectionProps> = ({ aiConfig }) => {
  const usageStats = useMemo(() => dbService.getUsageStats(), [aiConfig]);
  const data = dbService.getData();
  const usageHistory = data.usageHistory || [];
  
  const tokenLimit = aiConfig.monthlyTokenLimit || 1000000;
  const tokenUsagePercent = Math.min(100, ((usageStats.totalTokens as number) / (tokenLimit as number)) * 100);

  const chartData = useMemo(() => {
    return Object.entries(usageStats.byFeature)
      .map(([name, tokens]) => ({ name, tokens }))
      .sort((a, b) => (b.tokens as number) - (a.tokens as number))
      .slice(0, 10);
  }, [usageStats]);

  const COLORS = ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c', '#34d399', '#22d3ee', '#818cf8', '#6366f1', '#4f46e5'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>📊</span> Usage & Telemetry
        </h2>
        <p className="text-slate-400 mt-1">Real-time ingestion analysis and Gemini API cost monitoring.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Tokens (MTD)</p>
           <p className="text-3xl font-bold text-indigo-400">{usageStats.totalTokens.toLocaleString()}</p>
           <p className="text-xs text-slate-500 mt-1 italic">~${(usageStats.totalTokens / 1000000 * 0.5).toFixed(4)} estimated cost</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Average Latency</p>
           <p className="text-3xl font-bold text-emerald-400">{Math.round(usageStats.avgLatency)}ms</p>
           <p className="text-xs text-slate-500 mt-1 italic">Response health is optimal</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Success Rate</p>
           <p className="text-3xl font-bold text-amber-400">
             {usageHistory.length > 0 
               ? (usageHistory.filter(h => h.success).length / usageHistory.length * 100).toFixed(1) 
               : '100'}%
           </p>
           <p className="text-xs text-slate-500 mt-1 italic">Across {usageHistory.length} requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6">Token Consumption Breakdown</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Token Ceiling Progress</label>
              <span className="text-xs font-bold text-slate-300">
                {tokenUsagePercent.toFixed(1)}% used
              </span>
            </div>
            <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  tokenUsagePercent > 90 ? 'bg-red-500' : tokenUsagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${tokenUsagePercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-0 shadow-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Live Ingestion History</h3>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Last 200 Operations</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[450px]">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 z-10">
                <tr className="text-slate-600">
                  <th className="px-6 py-3 font-black uppercase tracking-widest">Feature</th>
                  <th className="px-6 py-3 font-black uppercase tracking-widest">Tokens</th>
                  <th className="px-6 py-3 font-black uppercase tracking-widest text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {usageHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-300 truncate max-w-[150px]">{h.feature}</p>
                      <p className="text-[8px] text-slate-600 mt-0.5">
                        {new Date(h.timestamp).toLocaleTimeString()} • {h.model.replace('gemini-', '')}
                        {!h.success && <span className="ml-2 text-red-500 font-bold">FAILED</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div className="flex flex-col">
                        <span className="text-slate-400">{h.totalTokens.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-600">I:{h.promptTokens} O:{h.candidatesTokens}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                      {h.latencyMs}ms
                    </td>
                  </tr>
                ))}
                {usageHistory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center text-slate-600 italic">No telemetry data recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TelemetrySection;
