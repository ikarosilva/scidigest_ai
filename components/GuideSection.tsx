
import React from 'react';
import { exportService } from '../services/exportService';

const GUIDE_MARKDOWN = `# SciDigest AI: The Professional Researcher's Flight Deck

In an era where thousands of papers are published daily, the bottleneck in scientific progress is no longer access to data—it is the velocity of human digestion. **SciDigest AI** is a professional research assistant designed to turn information overload into high-density knowledge.

---

## 🚀 1. Intelligent Discovery (Beyond RSS)
Traditional feeds are noisy. SciDigest uses a **Human-in-the-Loop** approach to discovery:
- **AI Recommends**: Learns from your 1-10 library ratings to prioritize new pre-prints and articles.
- **Sonar Tracker**: Actively sweeps the live web for forward-citations and author bibliography updates, catching breakthroughs months before they hit mainstream aggregators.
- **Global Trends**: Connects you to high-velocity research and technical literature currently gaining traction in the global community.

## 📖 2. The Deep Reading Environment
The **Reader** isn't just a PDF viewer; it's a critical thinking lab:
- **Lexicon**: Instantly define complex technical terms with technical context provided by Gemini 3.
- **What If Assistant**: Chat with an AI "colleague" to explore hypothetical scenarios. Ask: *"What if they had used a Bayesian approach instead of frequentist?"* or *"What if this was applied to low-power edge devices?"*
- **Auto-Linked Notes**: Your annotations are automatically saved as Research Notes, creating a bi-directional link between your thoughts and the source material.

## 👿 3. The Reviewer 2 Protocol
Standard summaries are too polite. The **Reviewer 2 Protocol** provides an adversarial methodology audit. It identifies:
- Weak or hidden assumptions.
- Over-stated conclusions.
- Logical fallacies in the experimental design.
*Internalize research by seeing its flaws.*

## 🕸️ 4. Research Networks & Mastery
- **Knowledge Visualization**: Map the conceptual and citation links between your library and your notes. Identify the "Dataset Hubs" that anchor your field.
- **Academy**: Visualize your proficiency using a **Dunning-Kruger Confidence Map**. Validate your expertise through AI-generated conceptual quizzes that move you from BS to PhD levels within the app.

## 🔐 5. Privacy & Sovereignty
SciDigest is **Local-First**:
- **E2E Encryption**: Cloud sync is secured with client-side **AES-GCM 256-bit encryption**. Your IP stays yours.
- **No-Auth Portability**: Sync your whole research trajectory with a simple private key.
- **Academic Standards**: Export your collection to **BibTeX** for instant integration with Zotero or LaTeX.

---
*Created for senior researchers by senior engineers. Powered by Google Gemini.*
`;

const GuideSection: React.FC = () => {
  const handleDownload = () => {
    exportService.downloadFile(GUIDE_MARKDOWN, 'SciDigest_User_Guide.md', 'text/markdown');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">User Guide</h2>
          <p className="text-slate-400 mt-2">Documentation for the high-velocity researcher.</p>
        </div>
        <button 
          onClick={handleDownload}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <span>📥</span> Download Markdown (.md)
        </button>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
        <article className="prose prose-invert prose-indigo max-w-none prose-h1:text-4xl prose-h1:font-black prose-h2:text-2xl prose-h2:font-bold prose-p:text-slate-400 prose-li:text-slate-400 leading-relaxed font-sans">
          <h1 className="text-white mb-8 border-b border-slate-800 pb-4">SciDigest AI: The Professional Researcher's Flight Deck</h1>
          
          <p className="text-lg">In an era where thousands of papers are published daily, the bottleneck in scientific progress is no longer access to data—it is the velocity of human digestion. <strong>SciDigest AI</strong> is a professional research assistant designed to turn information overload into high-density knowledge.</p>

          <div className="my-10 h-px bg-slate-800 w-full"></div>

          <h2 className="text-indigo-400 flex items-center gap-3">
             <span className="bg-indigo-500/10 p-2 rounded-lg">🚀</span> 1. Intelligent Discovery
          </h2>
          <p>Traditional feeds are noisy. SciDigest uses a <strong>Human-in-the-Loop</strong> approach to discovery:</p>
          <ul>
            <li><strong>AI Recommends</strong>: Learns from your 1-10 library ratings to prioritize new pre-prints and articles.</li>
            <li><strong>Sonar Tracker</strong>: Actively sweeps the live web for forward-citations and author updates.</li>
            <li><strong>Global Trends</strong>: Connects you to technical literature currently gaining traction in the global community.</li>
          </ul>

          <h2 className="text-indigo-400 flex items-center gap-3 mt-12">
             <span className="bg-indigo-500/10 p-2 rounded-lg">📖</span> 2. The Deep Reading Environment
          </h2>
          <p>The <strong>Reader</strong> isn't just a PDF viewer; it's a critical thinking lab:</p>
          <ul>
            <li><strong>Lexicon</strong>: Instantly define complex technical terms with technical context.</li>
            <li><strong>What If Assistant</strong>: Chat with an AI "colleague" to explore hypothetical scenarios and methodology variations.</li>
            <li><strong>Auto-Linked Notes</strong>: Annotations are automatically saved as linked Research Notes.</li>
          </ul>

          <h2 className="text-indigo-400 flex items-center gap-3 mt-12">
             <span className="bg-indigo-500/10 p-2 rounded-lg">👿</span> 3. The Reviewer 2 Protocol
          </h2>
          <p>Standard summaries are too polite. The <strong>Reviewer 2 Protocol</strong> provides an adversarial methodology audit. It identifies weak assumptions and experimental design fallacies, simulating the toughest peer reviews.</p>

          <h2 className="text-indigo-400 flex items-center gap-3 mt-12">
             <span className="bg-indigo-500/10 p-2 rounded-lg">🕸️</span> 4. Research Networks & Mastery
          </h2>
          <ul>
            <li><strong>Knowledge Visualization</strong>: Map the conceptual and citation links between your library and your notes.</li>
            <li><strong>Academy</strong>: Visualize your proficiency using a <strong>Dunning-Kruger Confidence Map</strong>, validated via AI conceptual quizzes.</li>
          </ul>

          <h2 className="text-indigo-400 flex items-center gap-3 mt-12">
             <span className="bg-indigo-500/10 p-2 rounded-lg">🔐</span> 5. Privacy & Sovereignty
          </h2>
          <p>Built on a privacy-first foundation. All data is encrypted client-side using <strong>AES-GCM 256-bit encryption</strong> before cloud sync. Export your collection to BibTeX (.bib) for instant integration with Zotero or LaTeX.</p>
        </article>
      </div>

      <footer className="text-center opacity-40">
        <p className="text-xs uppercase tracking-widest font-black">Official Publication Material • v1.5.1</p>
      </footer>
    </div>
  );
};

export default GuideSection;
