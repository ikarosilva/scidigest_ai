
import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, Cell, ReferenceLine
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

  // 1. Calculate Badge Stats per Topic based on passed quizzes
  const topicStats = useMemo(() => {
    return interests.map(topic => {
      const passedQuizzes = articles.filter(a => 
        a.quizStatus === 'pass' && 
        a.tags.some(t => t.toLowerCase().includes(topic.toLowerCase()))
      ).length;

      let badge = 'Novice';
      let rankColor = 'text-slate-500';
      let score = 0;

      // Academic Ladder: BS (1) -> MS (5) -> PhD (20) -> Professor (50) -> Eternal Student (100)
      if (passedQuizzes >= 100) { badge = 'Eternal Student'; rankColor = 'text-cyan-400'; score = 100; }
      else if (passedQuizzes >= 50) { badge = 'Professor'; rankColor = 'text-emerald-400'; score = 80; }
      else if (passedQuizzes >= 20) { badge = 'PhD'; rankColor = 'text-indigo-400'; score = 60; }
      else if (passedQuizzes >= 5) { badge = 'MS'; rankColor = 'text-amber-400'; score = 30; }
      else if (passedQuizzes >= 1) { badge = 'BS'; rankColor = 'text-slate-300'; score = 10; }

      // Custom Dunning-Kruger Confidence mapping
      // X = Knowledge (0-100 derived from quizzes), Y = Confidence (0-100)
      let dkX = Math.min(passedQuizzes, 100);
      let dkY = 0;

      if (dkX === 0) dkY = 0;
      else if (dkX < 5) dkY = 80 + (dkX * 4); // Peak of Mount Ignorance
      else if (dkX < 15) dkY = 100 - (dkX * 5); // Valley of Despair
      else if (dkX < 50) dkY = 20 + (dkX - 15) * 1.5; // Slope of Enlightenment
      else dkY = 70 + (dkX - 50) * 0.3; // Plateau of Sustainability

      return {
        topic,
        passedQuizzes,
        badge,
        rankColor,
        dkX,
        dkY,
        fullValue: Math.min(passedQuizzes, 100)
      };
    });
  }, [interests, articles]);

  const radarData = useMemo(() => {
    return topicStats.map(s => ({
      subject: s.topic,
      A: s.fullValue,
      fullMark: 100,
    }));
  }, [topicStats]);

  const formatReadTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <span>🎓</span> Research Academy
          </h2>
          <p className="text-slate-400 mt-1">Measuring conceptual mastery across your research trajectories.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-2xl flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Immersion Time</span>
              <span className="text-lg font-bold text-emerald-400">{formatReadTime(totalReadTime)}</span>
           </div>
           <button 
            onClick={() => onNavigate('library')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            Open Library →
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Map / Spider Plot */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-8">
             <h3 className="text-lg font-bold text-white">Research Shape</h3>
             <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Cross-Disciplinary Coverage</p>
          </div>
          <div className="w-full h-80 mt-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Proficiency"
                  dataKey="A"
                  stroke="#818cf8"
                  fill="#818cf8"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dunning-Kruger Curve Plot */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col">
          <div className="flex justify-between items-start mb-6">
             <div>
                <h3 className="text-lg font-bold text-white">The Path to Mastery</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Dunning-Kruger Competence Map</p>
             </div>
             <div className="flex gap-4 text-[9px] uppercase font-black">
                <span className="text-slate-500">X: Knowledge</span>
                <span className="text-slate-500">Y: Confidence</span>
             </div>
          </div>
          
          <div className="flex-1 h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="dkX" name="Knowledge" hide domain={[0, 110]} />
                <YAxis type="number" dataKey="dkY" name="Confidence" hide domain={[0, 120]} />
                <ZAxis type="number" range={[100, 400]} />
                
                <ReferenceLine x={5} stroke="#334155" strokeDasharray="3 3" />
                <ReferenceLine x={20} stroke="#334155" strokeDasharray="3 3" />
                
                <Tooltip 
                   cursor={{ strokeDasharray: '3 3' }} 
                   content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       const data = payload[0].payload;
                       return (
                         <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl">
                           <p className="text-xs font-bold text-white mb-1">{data.topic}</p>
                           <p className={`text-[10px] font-black uppercase ${data.rankColor}`}>{data.badge}</p>
                           <p className="text-[9px] text-slate-500 mt-2">{data.passedQuizzes} Concepts Internalized</p>
                         </div>
                       );
                     }
                     return null;
                   }}
                />

                <Scatter name="Topics" data={topicStats}>
                  {topicStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.dkX < 10 ? '#f87171' : entry.dkX < 30 ? '#fbbf24' : '#34d399'} 
                      strokeWidth={2}
                      stroke="#fff"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* Conceptual Dunning-Kruger Curve Background */}
            <div className="absolute inset-0 pointer-events-none px-12 py-10 opacity-10">
               <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  <path 
                    d="M 0 100 Q 10 0 20 80 T 50 40 T 100 20" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="0.5" 
                  />
               </svg>
            </div>

            {/* Stage Labels */}
            <div className="absolute top-4 left-10 text-[8px] font-black text-slate-700 uppercase rotate-[-45deg]">Mt. Ignorance</div>
            <div className="absolute bottom-10 left-32 text-[8px] font-black text-slate-700 uppercase">Valley of Despair</div>
            <div className="absolute bottom-24 left-1/2 text-[8px] font-black text-slate-700 uppercase rotate-[-20deg]">Enlightenment</div>
            <div className="absolute top-16 right-10 text-[8px] font-black text-slate-700 uppercase">Plateau</div>
          </div>
        </div>
      </div>

      {/* Badge Registry Grid */}
      <section className="space-y-6">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">Academic Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topicStats.map(s => (
            <div key={s.topic} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center group hover:border-indigo-500/30 transition-all">
               <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl bg-slate-950 border-2 border-slate-800 shadow-inner group-hover:scale-110 transition-transform ${s.rankColor.replace('text-', 'border-')}`}>
                  {s.badge === 'BS' && '📜'}
                  {s.badge === 'MS' && '🎓'}
                  {s.badge === 'PhD' && '🧪'}
                  {s.badge === 'Professor' && '🏛️'}
                  {s.badge === 'Eternal Student' && '♾️'}
                  {s.badge === 'Novice' && '🌱'}
               </div>
               <h4 className="text-sm font-bold text-slate-200 truncate w-full mb-1">{s.topic}</h4>
               <p className={`text-[10px] font-black uppercase tracking-widest ${s.rankColor}`}>{s.badge}</p>
               
               <div className="w-full h-1 bg-slate-950 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(s.passedQuizzes, 100)}%` }}
                  ></div>
               </div>
               <div className="flex justify-between w-full mt-2">
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{s.passedQuizzes} Pass</span>
                  <span className="text-[9px] text-slate-600 font-bold uppercase">Next: {s.badge === 'Novice' ? '1' : s.badge === 'BS' ? '5' : s.badge === 'MS' ? '20' : s.badge === 'PhD' ? '50' : '100'}</span>
               </div>
            </div>
          ))}
          {topicStats.length === 0 && (
             <div className="col-span-full py-12 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2rem]">
                <p className="text-slate-500 italic">No topics defined. Head to the Topics tab to start your academic path.</p>
             </div>
          )}
        </div>
      </section>

      {/* Mastery Scale Legend */}
      <footer className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-wrap justify-center gap-10 opacity-60">
         <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">BS</span>
            <span className="text-[10px] text-slate-600">1 Pass</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-amber-500 font-bold">MS</span>
            <span className="text-[10px] text-slate-600">5 Pass</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-400 font-bold">PhD</span>
            <span className="text-[10px] text-slate-600">20 Pass</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 font-bold">Prof</span>
            <span className="text-[10px] text-slate-600">50 Pass</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-bold">Eternal Student</span>
            <span className="text-[10px] text-slate-600">100 Pass</span>
         </div>
      </footer>
    </div>
  );
};

export default Academy;
