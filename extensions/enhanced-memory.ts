import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { loadConfig, DEFAULT_CONFIG, type MemoryConfig } from "./lib/config";
import { registerHandlers } from "./lib/handlers";
import { MemoryServer } from "./lib/memory-server";
import { VectorStore } from "./lib/vector-store";
import { LocalEmbedder } from "./lib/local-embedder";
import { gitInit } from "./lib/git-memory";
import { homedir } from "node:os";
import { join } from "node:path";

const MEM_DIR = join(homedir(), ".pi", "memory");
const embedder = new LocalEmbedder();
const store = new VectorStore(embedder);
let server: MemoryServer | null = null;
let serverReady = false;

export default function enhancedMemory(pi: ExtensionAPI) {
	const config = loadConfig(pi.settings?.memory ?? {});
	const deps = registerHandlers(pi, store, config, MEM_DIR);

	pi.on("session_start", async (event: any) => {
		if (!serverReady) {
			const memCount = store.loadFromDisk();
			deps.profile.loadFromDisk();
			gitInit(MEM_DIR);
			server = new MemoryServer({ port: config.port, store, profile: deps.profile });
			await server.start();
			serverReady = true;
		}
		const ctx = await deps.injectContext(event, config);
		return ctx;
	});

	pi.on("message_end", async (event: any) => deps.onMessage(event));
}