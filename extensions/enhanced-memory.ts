/**
 * pi-memory-enhanced — Pi agent memory enhancement extension.
 *
 * Features:
 * - Semantic vector search (MockEmbedder for fast startup, LocalEmbedder for production)
 * - Auto-capture: extracts facts from conversation messages (pattern-based, no LLM calls)
 * - Memory decay: time-based scoring with reinforcement
 * - User profile: auto-built from dotted-key facts
 * - Web dashboard: http://localhost:4748 (memories, search, profile)
 * - /memory-search command for manual lookups
 *
 * Install: copy this file + extensions/lib/ to ~/.pi/agent/extensions/
 * Or add "npm:pi-memory-enhanced" to ~/.pi/agent/settings.json packages[]
 * Toggle: /piforge disable enhanced-memory | /piforge enable enhanced-memory
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { Embedding } from "./lib/embedding";
import { MockEmbedder } from "./lib/mock-embedder";
import { VectorStore } from "./lib/vector-store";
import { AutoCapture } from "./lib/auto-capture";
import { UserProfile } from "./lib/user-profile";
import { MemoryServer } from "./lib/memory-server";

const PORT = 4748;
const embedder = new MockEmbedder();
const store = new VectorStore(embedder);
const capture = new AutoCapture();
const profile = new UserProfile();
let server: MemoryServer | null = null;

async function startServer() {
  server = new MemoryServer({ port: PORT }, embedder);
  try { await server.start(); } catch { /* port in use */ }
}

async function captureFacts(event: any) {
  const text = event.message?.content ?? "";
  if (typeof text !== "string" || text.length < 10) return;
  for (const f of await capture.extract(text)) {
    await store.put(f.key, f.value, { category: f.category });
    profile.addFact(f.key, f.value);
  }
}

export default function enhancedMemory(pi: ExtensionAPI) {
  pi.on("session_start", async () => { if (!server) await startServer(); });
  pi.on("message_end", async (event: any) => captureFacts(event));
  pi.registerCommand("memory-search", {
    description: "Search memories semantically",
    handler: async (args: string, _ctx: ExtensionCommandContext) => { void store.search(args); },
  });
}