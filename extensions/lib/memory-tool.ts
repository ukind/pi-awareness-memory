import { Type } from "@sinclair/typebox";
import type { SqliteStore } from "./sqlite-store";
import type { UserProfile } from "./user-profile";
import { stripPrivateContent, isFullyPrivate } from "./privacy";

export const memoryToolSchema = Type.Object({
	mode: Type.Union([
		Type.Literal("add"),
		Type.Literal("search"),
		Type.Literal("list"),
		Type.Literal("forget"),
		Type.Literal("profile"),
	]),
	content: Type.Optional(Type.String()),
	query: Type.Optional(Type.String()),
	tags: Type.Optional(Type.String()),
	userTag: Type.Optional(Type.String()),
	projectTag: Type.Optional(Type.String()),
	repoTag: Type.Optional(Type.String()),
	memoryId: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number()),
});

export interface MemoryToolDeps {
	store: SqliteStore;
	profile: UserProfile;
	getProjectPath: () => string;
	getSessionId: () => string;
}

export async function executeMemoryTool(
	args: {
		mode: string;
		content?: string;
		query?: string;
		tags?: string;
		userTag?: string;
		projectTag?: string;
		repoTag?: string;
		memoryId?: string;
		limit?: number;
	},
	deps: MemoryToolDeps,
): Promise<string> {
	switch (args.mode) {
		case "add":
			return handleAdd(args, deps);
		case "search":
			return handleSearch(args, deps);
		case "list":
			return handleList(args, deps);
		case "forget":
			return handleForget(args, deps);
		case "profile":
			return handleProfile(deps);
		default:
			return JSON.stringify({
				success: false,
				error: `Unknown mode: ${args.mode}`,
			});
	}
}

async function handleAdd(
	args: { content?: string; tags?: string },
	deps: MemoryToolDeps,
): Promise<string> {
	if (!args.content)
		return JSON.stringify({ success: false, error: "content required" });
	const sanitized = stripPrivateContent(args.content);
	if (isFullyPrivate(args.content))
		return JSON.stringify({ success: false, error: "Private content blocked" });
	const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	await deps.store.put({
		id,
		content: sanitized,
		tags: args.tags,
		session_id: deps.getSessionId(),
		project_path: deps.getProjectPath(),
	});
	return JSON.stringify({ success: true, id, tags: args.tags });
}

async function handleSearch(
	args: {
		query?: string;
		limit?: number;
		userTag?: string;
		projectTag?: string;
		repoTag?: string;
	},
	deps: MemoryToolDeps,
): Promise<string> {
	if (!args.query)
		return JSON.stringify({ success: false, error: "query required" });
	const results = await deps.store.search({
		query: args.query,
		topK: args.limit ?? 10,
		projectPath: deps.getProjectPath(),
		user_tag: args.userTag,
		project_tag: args.projectTag,
		repo_tag: args.repoTag,
	});
	return JSON.stringify({
		success: true,
		count: results.length,
		results: results.map((r) => ({
			id: r.id,
			content: r.content,
			similarity: Math.round(r.score * 100),
			tags: r.tags,
		})),
	});
}

async function handleList(
	args: { limit?: number },
	deps: MemoryToolDeps,
): Promise<string> {
	const results = await deps.store.list({
		limit: args.limit ?? 20,
		projectPath: deps.getProjectPath(),
	});
	return JSON.stringify({
		success: true,
		count: results.length,
		memories: results.map((r) => ({
			id: r.id,
			content: r.content,
			createdAt: r.created_at,
			tags: r.tags,
		})),
	});
}

async function handleForget(
	args: { memoryId?: string },
	deps: MemoryToolDeps,
): Promise<string> {
	if (!args.memoryId)
		return JSON.stringify({ success: false, error: "memoryId required" });
	const ok = await deps.store.delete(args.memoryId);
	return ok
		? JSON.stringify({ success: true })
		: JSON.stringify({ success: false, error: "Memory not found" });
}

async function handleProfile(deps: MemoryToolDeps): Promise<string> {
	return JSON.stringify({ success: true, profile: deps.profile.build() });
}
