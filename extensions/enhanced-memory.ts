/**
 * pi-memory-enhanced — Pi agent memory enhancement extension.
 *
 * Features:
 * - Semantic vector search (384-dim all-MiniLM-L6-v2 local embeddings)
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
import { LocalEmbedder } from "./lib/local-embedder";
import { MockEmbedder } from "./lib/mock-embedder";
import { VectorStore } from "./lib/vector-store";
import { AutoCapture } from "./lib/auto-capture";
import { UserProfile } from "./lib/user-profile";
import { MemoryServer } from "./lib/memory-server";

const PORT = 4748;
const embedder = new LocalEmbedder();
const store = new VectorStore(embedder);
const capture = new AutoCapture();
const profile = new UserProfile();
let server: MemoryServer | null = null;

async function startServer() {
  server = new MemoryServer({ port: PORT, store, profile });
  try { await server.start(); } catch (e) { console.error("[pi-awareness-memory] server start failed:", e); }
}

async function captureFacts(event: any) {
  const msg = event.message ?? event;
  let text: string;
  if (typeof msg === "string") {
    text = msg;
  } else if (msg?.content) {
    text = Array.isArray(msg.content)
      ? msg.content.filter((c: any) => typeof c === "string" || c?.type === "text").map((c: any) => typeof c === "string" ? c : c.text ?? "").join(" ")
      : String(msg.content);
  } else {
    return;
  }
  if (!text || text.length < 5) return;
  console.log("[pi-awareness-memory] capturing:", text.slice(0, 80));
  try {
    for (const f of await capture.extract(text)) {
      await store.put(f.key, f.value, { category: f.category });
      profile.addFact(f.key, f.value);
      console.log("[pi-awareness-memory] captured:", f.key, "=", f.value.slice(0, 40));
    }
  } catch (e: any) {
    console.error("[pi-awareness-memory] capture error:", e?.message ?? e);
  }
}

export default function enhancedMemory(pi: ExtensionAPI) {
  pi.on("session_start", async () => { if (!server) await startServer(); });
  pi.on("message_end", async (event: any) => captureFacts(event));
  pi.registerCommand("memory-search", {
    description: "Search memories semantically",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const results = await store.search(args);
      const lines = results.map((r: any) => `${r.key}: ${r.value} (${(r.score * 100).toFixed(1)}%)`);
      await ctx.pi.sendMessage({
        display: lines.length ? lines.join("\n") : "No memories found.",
        details: { results },
      });
    },
  });
}