# SciDigest AI: Quality Manifest & Functional Map

This document serves as the single source of truth for the application's intended behavior. All updates must verify they do not break the "Critical Zones" listed below.

## 🔴 Critical Zone 1: Data Sovereignty & Persistence
| Feature | Expected Behavior | Verification Point |
| :--- | :--- | :--- |
| **LocalStorage DB** | State survives browser refresh. | `dbService.getData()` |
| **AES-GCM Sync** | Data is encrypted client-side using Sync Key. | `cloudSyncService.uploadData` |
| **JSON Portability** | Full backup/restore preserves all library metadata. | `Settings -> Export JSON` |
| **BibTeX Export** | Generates standard-compliant .bib keys and abstracts. | `exportService.generateBibTeX` |

## 🟡 Critical Zone 2: AI Ingestion & Analysis
| Feature | Expected Behavior | Verification Point |
| :--- | :--- | :--- |
| **PDF Extraction** | Gemini Flash extracts Title, Authors, Abstract, Year. | `geminiService.extractMetadataFromPDF` |
| **Reviewer 2** | Adversarial audit provides critical/skeptical feedback. | `Reader -> Reviewer 2 Tab` |
| **Grounding** | Google Search results show verified URLs in UI. | `Trending -> Grounding Sources` |
| **QuickTake** | 1-sentence technical essence generation. | `Feed -> Ingest & Rank` |

## 🟢 Critical Zone 3: Research UX
| Feature | Expected Behavior | Verification Point |
| :--- | :--- | :--- |
| **Reader Timer** | Tracks active seconds; pauses on command; syncs to total time. | `Reader -> Timer Logic` |
| **Rabbit Hole** | Discovery of references with library-match checks. | `Reader -> Rabbit Hole Tab` |
| **Networks** | Force-graph renders articles, notes, and topic links. | `NetworkGraph Component` |
| **Academy** | Proficiency badges map to Dunning-Kruger curve points. | `Academy Component` |

## 🔵 Blue Zone: User Systems Log Workflow
This workflow replaces automated telemetry with manual, user-driven diagnostics for version **1.5.2+**.

### 🛠️ Log Identification Protocol
To ensure rapid triage, all log payloads copied from the app are tagged with unique signatures. When these are pasted into the chat, the AI will immediately identify them as "User Systems Logs".

1. **Header Signature**: `--- SCI-DIGEST SYSTEM LOG DATA [vVERSION_NUMBER] ---`
2. **Metadata Block**: Includes `METADATA: Exported=TIMESTAMP | DebugMode=BOOLEAN | BufferSize=INT`
3. **Entry Format**: `[TYPE] [TIME] MESSAGE | CTX: {JSON_DATA}`
4. **Footer Signature**: `--- END OF LOG DATA ---`

### 📝 Example Diagnostic Payload
```text
--- SCI-DIGEST SYSTEM LOG DATA [v1.5.2] ---
METADATA: Exported=2024-06-12T14:30:00.000Z | DebugMode=true | BufferSize=3

[INFO] [2:28:45 PM] Version updated from 1.5.1 to 1.5.2. Purging diagnostic buffer.
[DEBUG] [2:29:10 PM] [GEMINI] PDF Metadata Extraction Started | CTX: {"fileName": "neural_nets.pdf"}
[ERROR] [2:29:12 PM] PDF Metadata Extraction Failed: API key not valid. | CTX: {"error": "API key not valid", "model": "gemini-3-flash-preview"}

--- END OF LOG DATA ---
```

### 🤖 Mandatory AI Reaction Protocol
When the AI identifies the signatures above:
1. **Interrupt** standard conversational flow.
2. **Acknowledge** the specific application version (e.g., "DIAGNOSTIC DETECTED: Analyzing logs for v1.5.2").
3. **Analyze** the METADATA to confirm if `DebugMode` was active (request user to enable it if not).
4. **Identify** the first occurrence of `[ERROR]` or `[WARNING]`.
5. **Cross-Reference** the `CTX` data with the current codebase to pinpoint the file and line of failure.
6. **Propose** a fix and a corresponding unit test.

### 🔍 Monitoring Strategy
- **Privacy**: No API keys or PII (Personally Identifiable Information) are ever written to the log buffer.
- **Auto-Purge**: The log buffer is automatically reset upon any application version change to prevent cross-version confusion.

## 🧹 Lean Code Protocol & Safety
1. **Unused Code**: No unused imports allowed.
2. **Pruning Permission**: AI must ask for permission before deleting any file.
3. **Checkpoint Rule**: A "Full JSON Backup" must be requested before any structural code removal.
4. **Reversibility**: All deletions must be documented in a pruning registry.