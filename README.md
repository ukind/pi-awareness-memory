# pi-awareness-memory

Memory enhancement for Pi coding agent, inspired by opencode-mem.

## Features

- **Semantic Vector Search** — Find memories by meaning (cosine similarity on embeddings)
- **Auto-Capture** — Extracts facts from conversations (preferences, OS, editor, project)
- **Memory Decay** — Time-based scoring with reinforcement
- **User Profile** — Auto-built from dotted-key facts
- **Web Dashboard** — Browse/search memories at http://localhost:4748

## Installation

Add to `~/.pi/agent/settings.json`:

```json
{ "packages": ["npm:pi-awareness-memory"] }
```

Or copy `extensions/` directory to `~/.pi/agent/extensions/`.

## Usage

Auto-activates on session start. Commands:

| Command | Description |
|---------|-------------|
| `/memory-search <query>` | Search memories semantically |

Web dashboard: http://localhost:4748

## Switching Embeddings

Default: MockEmbedder (8-dim, fast). For production:

```typescript
import { LocalEmbedder } from "./lib/local-embedder";
const embedder = new LocalEmbedder(); // 384-dim, all-MiniLM-L6-v2
```

## Development

```bash
bun install && bun test
```

## License

MIT
