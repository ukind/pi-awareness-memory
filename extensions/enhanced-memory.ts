/**
 * pi-awareness-memory — Pi agent memory extension.
 * Stores conversation messages with semantic embeddings for vector search.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { LocalEmbedder } from "./lib/local-embedder";
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
	try {
		await server.start();
		console.log("[pi-awareness-memory] dashboard started on port " + PORT);
	} catch (e: any) {
		console.error("[pi-awareness-memory] server start failed:", e?.message ?? e);
	}
}

function extractText(event: any): string {
	const msg = event.message ?? event;
	if (typeof msg === "string") return msg;
	if (msg?.content) {
		if (Array.isArray(msg.content)) {
			return msg.content
				.filter((c: any) => typeof c === "string" || c?.type === "text")
				.map((c: any) => (typeof c === "string" ? c : c.text ?? ""))
				.join(" ");
		}
		return String(msg.content);
	}
	return "";
}

async function onMessageEnd(event: any) {
	const text = extractText(event);
	if (!capture.shouldCapture(text)) return;
	console.log("[pi-awareness-memory] capturing:", text.slice(0, 80));
	try {
		const key = capture.makeKey(text);
		await store.put(key, text, { category: "message" });
		profile.addFact(key, text);
		console.log("[pi-awareness-memory] stored:", key);
	} catch (e: any) {
		console.error("[pi-awareness-memory] store error:", e?.message ?? e);
	}
}

export default function enhancedMemory(pi: ExtensionAPI) {
	pi.on("session_start", async () => { if (!server) await startServer(); });
	pi.on("message_end", async (event: any) => onMessageEnd(event));
	pi.registerCommand("memory-search", {
		description: "Search memories semantically",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const results = await store.search(args);
			const lines = results.map((r: any) =>
				`${r.key}: ${r.value.slice(0, 100)} (${(r.score * 100).toFixed(1)}%)`
			);
			await ctx.pi.sendMessage({
				display: lines.length ? lines.join("\n") : "No memories found.",
				details: { results },
			});
		},
	});
}