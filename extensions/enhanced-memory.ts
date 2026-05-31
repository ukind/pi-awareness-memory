import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig, type MemoryConfig } from "./lib/config";
import { registerHandlers } from "./lib/handlers";
import { MemoryServer } from "./lib/memory-server";
import { SqliteStore } from "./lib/sqlite-store";
import { LocalEmbedder } from "./lib/local-embedder";
import { gitInit } from "./lib/git-memory";
import { migrateFromJson } from "./lib/migration";
import { executeMemoryTool, memoryToolSchema } from "./lib/memory-tool";
import { DeduplicationService } from "./lib/deduplication-service";
import { LanguageTracker } from "./lib/language-detector";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { homedir } from "node:os";
import { join } from "node:path";

const MEM_DIR = join(homedir(), ".pi", "memory");
const DB_PATH = join(MEM_DIR, "memories.db");
const embedder = new LocalEmbedder();
const store = new SqliteStore({ embedder, dbPath: DB_PATH });
let server: MemoryServer | null = null;
let serverReady = false;
let currentSessionId = "";
let currentProjectPath = "";
const languageTracker = new LanguageTracker();
const dedup = new DeduplicationService({ conn: store.connection });

export default function enhancedMemory(pi: ExtensionAPI) {
	const config = loadConfig(pi.settings?.memory ?? {});
	const deps = registerHandlers(
		pi,
		store,
		config,
		MEM_DIR,
		() => currentSessionId,
		() => currentProjectPath,
		undefined, // llmCall — set via pi.callModel if available
		dedup,
	);

	pi.on("session_start", async (event: any) => {
		currentProjectPath = event?.cwd ?? process.cwd();
		currentSessionId = event?.sessionId ?? "";
		if (!serverReady) {
			await migrateFromJson(store);
			deps.profile.loadFromDisk();
			gitInit(MEM_DIR);
			server = new MemoryServer({
				port: config.port,
				store,
				profile: deps.profile,
			});
			await server.start();
			serverReady = true;
		}
		const ctx = await deps.injectContext(event, config);
		return ctx;
	});

	pi.on("message_end", async (event: any) => deps.onMessage(event));

	// Task 4.7: Register memory tool
	pi.registerTool(
		defineTool({
			name: "memory",
			label: "Memory",
			description:
				"Manage and query project memory. Use 'search' with keywords, 'add' to store knowledge, 'profile' for preferences.",
			parameters: memoryToolSchema,
			async execute(
				toolCallId: string,
				params: any,
				signal: any,
				onUpdate: any,
				ctx: any,
			) {
				const result = await executeMemoryTool(params, {
					store,
					profile: deps.profile,
					getProjectPath: () => currentProjectPath,
					getSessionId: () => currentSessionId,
				});
				return { display: result };
			},
		}),
	);

	// Tasks 5.1-5.4: Compaction re-injection
	pi.on("session_compact", async (event: any) => {
		const sessionId = event?.compactionEntry?.sessionId ?? currentSessionId;
		if (!sessionId) return;
		const memories = await store.listBySession(sessionId);
		if (memories.length === 0) return;
		const lines = ["## Restored Session Memory\n"];
		for (const m of memories) {
			const tagStr = m.tags ? ` (tags: ${m.tags})` : "";
			lines.push(`- ${m.content}${tagStr}`);
		}
		pi.sendUserMessage(lines.join("\n"), { deliverAs: "followUp" });
	});
}
