# SciDigest AI - Professional Research Assistant

SciDigest AI is a high-performance, local-first research tool designed to help you monitor, filter, and digest the latest scientific breakthroughs using the Gemini 3 & 2.5 API ecosystem.

## 🚀 Key Modules & Features

### 📖 Integrated PDF Reader & Annotator
- **Split-Pane Workflow**: Read PDFs side-by-side with a professional Markdown editor.
- **Auto-Syncing Notes**: Annotations are automatically saved as linked Research Notes.
- **Host Integration**: Launch articles directly into your native PDF viewer (Preview, Acrobat, Zotero) with a single click.

### 🕸️ Research Networks
- **Knowledge Visualization**: Interactive force-directed graphs showing the connections between your papers and thoughts.
- **Citation Mining**: Uses Gemini Search grounding to discover backward citations and map the academic lineage of your library.
- **Three View Modes**: 
  - *Conceptual*: Focus on links between your private notes.
  - *Academic*: Focus on citation maps between published papers.
  - *Unified*: A full knowledge graph of the known and the reflected.

### ✨ AI Recommendation Engine (Human-in-the-Loop)
- **RLHF-Inspired Ranking**: Prioritizes incoming papers from HuggingFace, Nature, and arXiv based on your historical 1-10 ratings.
- **Discovery Bias**: Configurable settings for *Conservative* (narrow focus), *Balanced*, or *Exploratory* (novel/experimental) research discovery.

### 🔥 Trending & Impact Analysis
- **Velocity Tracking**: Discover papers with high citation velocity and community buzz.
- **Sentiment Research**: Automated analysis of academic reception and real-time citation count retrieval.

### 💾 Data & Privacy (Local-First)
- **End-to-End Encryption**: Cloud synchronization via Google Drive is secured with client-side **AES-GCM 256-bit encryption** (PBKDF2 key derivation).
- **No-Auth Portability**: Export your entire research trajectory as a single JSON file or sync seamlessly between devices using a private Sync Key.
- **Academic Standard**: Export your collection to BibTeX (.bib) for LaTeX or citation managers.

## 🛡️ Security Audit
- **API Key Management**: Hard-coded reliance on `process.env.API_KEY`. No local storage of keys.
- **Stateless Intelligence**: Content processing occurs in memory; no user data is stored on external AI servers.
- **Client-Side Cryptography**: Uses the Web Crypto API for industry-standard encryption before data egress.
- **Iframe Isolation**: PDF documents are rendered in sandboxed iframes to prevent script execution.

## 🛠️ Installation & Tech Stack
- **Framework**: React 19 (ESM)
- **Styling**: Tailwind CSS
- **Visualization**: React Force Graph & Recharts
- **Intelligence**: Google Gemini (Flash 3 & Pro 2.5)

---
*Developed for senior researchers in Machine Learning, Signal Processing, and Medicine.*
*Powered by Google Gemini.*