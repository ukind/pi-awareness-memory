# pi-awareness-memory

Memory enhancement for [Pi coding agent](https://github.com/mariozechner/pi-coding-agent), inspired by [opencode-mem](https://github.com/tickernelz/opencode-mem).

> Semantic vector search, auto-capture, memory decay, user profiles, and a web dashboard — all local, zero API cost.

## Features

| Feature | Description |
|---------|-------------|
| **Semantic Vector Search** | Find memories by meaning using 384-dim all-MiniLM-L6-v2 embeddings + cosine similarity |
| **Auto-Capture** | Automatically extracts facts from conversations (preferences, OS, editor, project context) |
| **Memory Decay** | Time-based scoring — older, unreinforced memories rank lower; frequently accessed ones persist |
| **User Profile** | Auto-built from captured facts (`user.os`, `pref.editor`, `project.*`) |
| **Web Dashboard** | Browse, search, and manage memories at http://localhost:4748 |

## Requirements

- **Node.js 24+** (uses built-in `node:sqlite` module, available from Node.js v24)

## Installation

### Option 1: npm package (recommended)

Add to `~/.pi/agent/settings.json`:

```json
{
  "packages": ["npm:pi-awareness-memory"]
}
```

### Option 2: Manual copy

```bash
cp -r extensions/ ~/.pi/agent/extensions/
```

## Usage

The extension activates automatically on session start.

### Commands

| Command | Description |
|---------|-------------|
| `/memory-search <query>` | Search memories semantically |

### Web Dashboard

Open http://localhost:4748 in your browser to:
- Browse all stored memories
- Search memories by keyword or semantic similarity
- View your auto-built user profile

### Auto-Capture Patterns

The extension automatically extracts facts from messages matching these patterns:

| Pattern | Key | Example |
|---------|-----|---------|
| `I prefer/use/like X` | `pref` | "I prefer vim for editing" |
| `My OS is X` / `I run X` | `user.os` | "My OS is Windows 11" |
| `use X for edit` | `pref.editor` | "I use vim for editing" |
| `project uses X` | `project` | "This project uses React" |
| `My name is X` | `user.name` | "My name is Alice" |
| `X is Y` | `fact` | "TypeScript is great" |

Trivial phrases like "ok sure yeah" are filtered out automatically.

## Architecture

```
Pi Extension API
    ├── session_start  →  Start MemoryServer on :4748
    ├── message_end    →  AutoCapture extracts facts → VectorStore
    └── /memory-search →  Semantic search via VectorStore

VectorStore (in-memory, cosine similarity)
    └── LocalEmbedder (384-dim all-MiniLM-L6-v2 via WASM)

MemoryServer (node:http)
    ├── GET /           →  HTML dashboard
    ├── GET /api/memories?q=  →  Semantic search results
    └── GET /api/profile      →  Auto-built user profile
```

## Embeddings

**Default**: LocalEmbedder (384-dim all-MiniLM-L6-v2) — runs locally via WASM, zero API cost.

The model is downloaded on first use (~25MB) and cached for subsequent sessions.

For testing, MockEmbedder provides 8-dim deterministic vectors:

```typescript
import { MockEmbedder } from "./lib/mock-embedder";
const embedder = new MockEmbedder(); // 8-dim, deterministic, fast
```

## Memory Decay

Memories are scored using exponential decay with reinforcement:

```
score = ageDecay × (0.5 + 0.5 × reinforcement)
ageDecay = exp(-0.693 × age / halfLife)
reinforcement = log(1 + accessCount) / log(2)
```

- **Half-life**: 30 days (configurable)
- **Frequently accessed** memories persist longer
- **Reinforced** memories decay slower

## Development

```bash
npm install
npm test
```

29 tests, all passing.

## License

MIT
