import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, Cell, ComposedChart, Line
} from 'recharts';
import { Article } from '../types';
import { dbService } from '../services/dbService';

interface AcademyProps {
  articles: Article[];
  totalReadTime: number;
  onNavigate: (tab: string) => void;
  onRead: (article: Article) => void;
}

const Academy: React.FC<AcademyProps> = ({ articles, totalReadTime, onNavigate, onRead }) => {
  const interests = dbService.getInterests();

  // The Dunning-Kruger Theoretical Data
  const dunningKrugerLine = useMemo(() => {
    return [
      { dkX: 0, dkY: 0 },
      { dkX: 5, dkY: 100 }, // Peak of Mount Ignorant
      { dkX: 15, dkY: 20 },  // Valley of Despair
      { dkX: 50, dkY: 70 },  // Slope of Enlightenment
      { dkX: 100, dkY: 85 }  // Plateau of Sustainability
    ];
  }, []);

  const topicStats = useMemo(() => {
    return interests.map(topic => {
      const passedQuizzes = articles.filter(a => 
        a.quizStatus === 'pass' && a.tags.some(t => t.toLowerCase().includes(topic.toLowerCase()))
      ).length;

      let badge = 'Novice';
      let rankColor = 'text-slate-500';
      let dkX = Math.min(passedQuizzes, 100);
      let dkY = 0;

      // Define ranks and DK coordinates
      if (passedQuizzes >= 100) { 
        badge = 'Eternal Student'; 
        rankColor = 'text-cyan-400';
        dkY = 85; 
      }
      else if (passedQuizzes >= 50) { 
        badge = 'Professor'; 
        rankColor = 'text-emerald-400'; 
        dkY = 70 + (dkX - 50) * 0.3;
      }
      else if (passedQuizzes >= 20) { 
        badge = 'PhD'; 
        rankColor = 'text-indigo-400'; 
        dkY = 20 + (dkX - 15) * 1.5;
      }
      else if (passedQuizzes >= 5) { 
        badge = 'MS'; 
        rankColor = 'text-amber-400'; 
        dkY = 100 - (dkX - 5) * 8; // Moving down into the valley
      }
      else if (passedQuizzes >= 1) { 
        badge = 'BS'; 
        rankColor = 'text-slate-300'; 
        dkY = dkX * 20; // Ascending to Mount Ignorant
      }

      return { topic, passedQuizzes, badge, rankColor, dkX, dkY, fullValue: Math.min(passedQuizzes, 100) };
    });
  }, [interests, articles]);

  const radarData = useMemo(() => topicStats.map(s => ({ subject: s.topic, A: s.fullValue, fullMark: 100 })), [topicStats]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <span>🎓</span> Research Academy
          </h2>
          <p className="text-slate-400 mt-1">Measuring mastery and mapping conceptual competence.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-2xl flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Immersion Time</span>
              <span className="text-lg font-bold text-emerald-400">{(totalReadTime/60).toFixed(1)}m</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-8">
             <h3 className="text-lg font-bold text-white">Research Shape</h3>
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Disciplinary Coverage</p>
          </div>
          <div className="w-full h-80 mt-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Proficiency" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
             <div>
                <h3 className="text-lg font-bold text-white">Path to Mastery</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Dunning-Kruger Competence Trajectory</p>
             </div>
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-[1px] bg-cyan-500/30"></div>
                   <span className="text-[8px] font-black text-slate-500 uppercase">Theoretical Curve</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                   <span className="text-[8px] font-black text-slate-500 uppercase">Your Position</span>
                </div>
             </div>
          </div>
          <div className="flex-1 h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <XAxis type="number" dataKey="dkX" domain={[0, 110]} hide />
                <YAxis type="number" dataKey="dkY" domain={[0, 110]} hide />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl">
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">{data.topic}</p>
                          <p className="text-xs font-bold text-white">{data.badge}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{data.passedQuizzes} Quizzes Passed</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                   data={dunningKrugerLine} 
                   type="monotone" 
                   dataKey="dkY" 
                   stroke="#22d3ee" 
                   strokeWidth={2} 
                   strokeDasharray="4 4"
                   dot={false} 
                   activeDot={false} 
                   opacity={0.4}
                />
                <Scatter name="Topics" data={topicStats}>
                  {topicStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.passedQuizzes === 0 ? '#1e293b' : entry.dkX < 10 ? '#f87171' : entry.dkX < 30 ? '#fbbf24' : '#34d399'} strokeWidth={1} stroke="#fff" />
                  ))}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
            
            <div className="absolute top-[10%] left-[5%] text-[8px] font-black text-cyan-400/50 uppercase tracking-widest rotate-[-45deg]">Mount Ignorant</div>
            <div className="absolute bottom-[25%] left-[15%] text-[8px] font-black text-cyan-400/50 uppercase tracking-widest">Valley of Despair</div>
            <div className="absolute bottom-[40%] left-[60%] text-[8px] font-black text-cyan-400/50 uppercase tracking-widest rotate-[-15deg]">Slope of Enlightenment</div>
            <div className="absolute top-[20%] right-[5%] text-[8px] font-black text-cyan-400/50 uppercase tracking-widest">Plateau of Sustainability</div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
             <span>Little Experience</span>
             <span>Topic Mastery</span>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Academic Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topicStats.map(s => (
            <div key={s.topic} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center group hover:border-indigo-500/30 transition-all">
               <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl bg-slate-950 border-2 border-slate-800 shadow-inner group-hover:scale-110 transition-transform ${s.passedQuizzes > 0 ? s.rankColor.replace('text-', 'border-') : 'border-slate-800'}`}>
                  {s.badge === 'BS' ? '📜' : s.badge === 'MS' ? '🎓' : s.badge === 'PhD' ? '🧪' : s.badge === 'Professor' ? '🏛️' : s.badge === 'Eternal Student' ? '♾️' : '🌱'}
               </div>
               <h4 className="text-sm font-bold text-slate-200 truncate w-full mb-1">{s.topic}</h4>
               <p className={`text-[10px] font-black uppercase tracking-widest ${s.rankColor}`}>{s.badge}</p>
               <div className="mt-4 w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${s.rankColor.replace('text-', 'bg-')}`} style={{ width: `${s.dkX}%` }}></div>
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Academy;