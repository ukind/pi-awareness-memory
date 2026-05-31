import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import type { SqliteStore } from "./sqlite-store";
import { UserProfile } from "./user-profile";
import { AutoCapture } from "./auto-capture";
import { DailyLog } from "./daily-log";
import { CoreProfile } from "./core-profile";
import { buildContext } from "./context-injector";
import { MonthlySummarizer } from "./monthly-summarizer";
import { formatStatus } from "./status-formatter";
import { gitCommit } from "./git-memory";
import { extractText } from "./extract-text";
import { stripPrivateContent, isFullyPrivate } from "./privacy";
import { IdleCapture } from "./idle-capture";
import { AiExtractor } from "./ai-extractor";
import type { DeduplicationService } from "./deduplication-service";
import type { MemoryConfig } from "./config";

export interface HandlerDeps {
	profile: UserProfile;
	injectContext: (event: any, cfg: MemoryConfig) => Promise<any>;
	onMessage: (event: any) => Promise<void>;
}

export function registerHandlers(
	pi: ExtensionAPI,
	store: SqliteStore,
	config: MemoryConfig,
	memDir: string,
	getSessionId: () => string,
	getProjectPath: () => string,
	llmCall?: (prompt: string, text: string) => Promise<string | null>,
	dedup?: DeduplicationService,
): HandlerDeps {
	const profile = new UserProfile();
	const capture = new AutoCapture();
	const dailyLog = new DailyLog();
	const core = new CoreProfile();
	const summarizer = new MonthlySummarizer();

	async function injectContext(event: any, cfg: MemoryConfig) {
		const results = await store.search({ query: "", topK: cfg.topK });
		const ctx = buildContext(
			results.map((r) => ({ key: r.id, value: r.content, score: r.score })),
			cfg.maxContextChars,
		);
		if (ctx && event?.systemPrompt !== undefined) {
			return { systemPrompt: `${event.systemPrompt}\n\n${ctx}` };
		}
	}

	const aiExtractor = llmCall ? new AiExtractor({ llmCall }) : null;

	const idleCapture = new IdleCapture(10000, 5);
	idleCapture.onFlush(async (texts: string[]) => {
		let items: string[];
		if (aiExtractor) {
			items = await aiExtractor.extractMemories(texts);
		} else {
			items = texts;
		}
		for (const item of items) {
			const key = dailyLog.makeDailyKey(item, messageCount);
			if (!key) continue;
			await store.put({
				id: key,
				content: item,
				category: "daily",
				session_id: getSessionId(),
				project_path: getProjectPath(),
			});
			profile.addFact(key, item);
			core.addLearning(key, item);
		}
		gitCommit(
			memDir,
			["memories.db", "profile.json"],
			`chore(memory): capture batch (${items.length} items)`,
		);
		dedup?.deduplicate();
	});

	let messageCount = 0;

	async function onMessage(event: any) {
		messageCount++;
		const text = extractText(event);
		if (!capture.shouldCapture(text)) return;
		const sanitized = stripPrivateContent(text);
		if (isFullyPrivate(text)) return;
		idleCapture.onMessage(sanitized);
	}

	pi.registerCommand("memory-search", {
		description: "Search memories semantically",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const results = await store.search({ query: args });
			const lines = results.map(
				(r: any) =>
					`${r.id}: ${r.content.slice(0, 100)} (${(r.score * 100).toFixed(1)}%)`,
			);
			await ctx.pi.sendMessage({
				display: lines.length ? lines.join("\n") : "No memories found.",
				details: { results },
			});
		},
	});

	pi.registerCommand("learning-month", {
		description: "Generate monthly memory summary",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const month = args.trim() || new Date().toISOString().slice(0, 7);
			const all = await store.list({ limit: 1000 });
			const summary = summarizer.summarize(
				all.map((r) => ({ key: r.id, value: r.content })),
				month,
			);
			await ctx.pi.sendMessage({ display: summary, details: { month } });
		},
	});

	pi.registerCommand("learning-status", {
		description: "Show memory status",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const all = await store.list({ limit: 1000 });
			const total = all.length;
			await ctx.pi.sendMessage({
				display: formatStatus({
					totalMemories: total,
					dailyEntries: total,
					coreLearnings: core.scoredCore(100).length,
					profileFacts: Object.keys(profile.build().preferences).length,
					port: config.port,
				}),
			});
		},
	});

	return { profile, injectContext, onMessage };
}
