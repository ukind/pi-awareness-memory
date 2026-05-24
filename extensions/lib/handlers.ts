import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { VectorStore } from "./vector-store";
import { UserProfile } from "./user-profile";
import { AutoCapture } from "./auto-capture";
import { DailyLog } from "./daily-log";
import { CoreProfile } from "./core-profile";
import { buildContext } from "./context-injector";
import { MonthlySummarizer } from "./monthly-summarizer";
import { formatStatus } from "./status-formatter";
import { gitCommit } from "./git-memory";
import { extractText } from "./extract-text";
import type { MemoryConfig } from "./config";

export interface HandlerDeps {
	profile: UserProfile;
	injectContext: (event: any, cfg: MemoryConfig) => Promise<any>;
	onMessage: (event: any) => Promise<void>;
}

export function registerHandlers(pi: ExtensionAPI, store: VectorStore, config: MemoryConfig, memDir: string): HandlerDeps {
	const profile = new UserProfile();
	const capture = new AutoCapture();
	const dailyLog = new DailyLog();
	const core = new CoreProfile();
	const summarizer = new MonthlySummarizer();
	async function injectContext(event: any, cfg: MemoryConfig) {
		const results = await store.search("", cfg.topK);
		const ctx = buildContext(results, cfg.maxContextChars);
		if (ctx && event?.systemPrompt !== undefined) {
			return { systemPrompt: `${event.systemPrompt}\n\n${ctx}` };
		}
	}

	let messageCount = 0;

	async function onMessage(event: any) {
		messageCount++;
		if (messageCount % 2 !== 1) return;
		const text = extractText(event);
		if (!capture.shouldCapture(text)) return;
		const key = dailyLog.makeDailyKey(text, messageCount);
		if (!key) return;
		await store.put(key, text, { category: "daily" });
		profile.addFact(key, text);
		core.addLearning(key, text);
		gitCommit(memDir, ["memories.json", "profile.json"], `chore(memory): store ${key}`);
	}

	pi.registerCommand("memory-search", {
		description: "Search memories semantically",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const results = await store.search(args);
			const lines = results.map((r: any) =>
				`${r.key}: ${r.value.slice(0, 100)} (${(r.score * 100).toFixed(1)}%)`);
			await ctx.pi.sendMessage({ display: lines.length ? lines.join("\n") : "No memories found.", details: { results } });
		},
	});

	pi.registerCommand("learning-month", {
		description: "Generate monthly memory summary",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const month = args.trim() || new Date().toISOString().slice(0, 7);
			const all = await store.search("");
			const summary = summarizer.summarize(all, month);
			await ctx.pi.sendMessage({ display: summary, details: { month } });
		},
	});

	pi.registerCommand("learning-status", {
		description: "Show memory status",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const total = (await store.search("")).length;
			await ctx.pi.sendMessage({ display: formatStatus({
				totalMemories: total, dailyEntries: total,
				coreLearnings: core.scoredCore(100).length,
				profileFacts: Object.keys(profile.build().preferences).length, port: config.port,
			}) });
		},
	});

	return { profile, injectContext, onMessage };
}