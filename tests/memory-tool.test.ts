import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { executeMemoryTool } from "../extensions/lib/memory-tool";
import { SqliteStore } from "../extensions/lib/sqlite-store";
import { MockEmbedder } from "../extensions/lib/mock-embedder";
import { UserProfile } from "../extensions/lib/user-profile";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let store: SqliteStore;
let profile: UserProfile;
let tmpDir: string;
const deps = () => ({
	store,
	profile,
	getProjectPath: () => "/test/project",
	getSessionId: () => "test-session",
});

beforeAll(() => {
	tmpDir = mkdtempSync(join(tmpdir(), "pi-tool-test-"));
	store = new SqliteStore({
		embedder: new MockEmbedder(),
		dbPath: join(tmpDir, "test.db"),
	});
	profile = new UserProfile();
});

afterAll(() => {
	store.close();
	try {
		rmSync(tmpDir, { recursive: true, force: true });
	} catch {}
});

describe("memory tool add", () => {
	test("add returns success with id", async () => {
		const result = JSON.parse(
			await executeMemoryTool({ mode: "add", content: "Test fact" }, deps()),
		);
		expect(result.success).toBe(true);
		expect(result.id).toBeDefined();
	});

	test("add with tags", async () => {
		const result = JSON.parse(
			await executeMemoryTool(
				{ mode: "add", content: "Tagged", tags: "a,b" },
				deps(),
			),
		);
		expect(result.success).toBe(true);
		expect(result.tags).toBe("a,b");
	});

	test("add without content fails", async () => {
		const result = JSON.parse(await executeMemoryTool({ mode: "add" }, deps()));
		expect(result.success).toBe(false);
	});

	test("add fully private content blocked", async () => {
		const result = JSON.parse(
			await executeMemoryTool(
				{ mode: "add", content: "<private>secret</private>" },
				deps(),
			),
		);
		expect(result.success).toBe(false);
		expect(result.error).toContain("Private");
	});
});

describe("memory tool search", () => {
	test("search returns results", async () => {
		await executeMemoryTool({ mode: "add", content: "React hooks" }, deps());
		const result = JSON.parse(
			await executeMemoryTool({ mode: "search", query: "React" }, deps()),
		);
		expect(result.success).toBe(true);
		expect(result.count).toBeGreaterThan(0);
	});

	test("search without query fails", async () => {
		const result = JSON.parse(
			await executeMemoryTool({ mode: "search" }, deps()),
		);
		expect(result.success).toBe(false);
	});
});

describe("memory tool list", () => {
	test("list returns memories", async () => {
		const result = JSON.parse(
			await executeMemoryTool({ mode: "list" }, deps()),
		);
		expect(result.success).toBe(true);
		expect(result.count).toBeGreaterThan(0);
	});
});

describe("memory tool forget", () => {
	test("forget deletes memory", async () => {
		const addResult = JSON.parse(
			await executeMemoryTool({ mode: "add", content: "To forget" }, deps()),
		);
		const result = JSON.parse(
			await executeMemoryTool(
				{ mode: "forget", memoryId: addResult.id },
				deps(),
			),
		);
		expect(result.success).toBe(true);
	});

	test("forget non-existent returns error", async () => {
		const result = JSON.parse(
			await executeMemoryTool(
				{ mode: "forget", memoryId: "nonexistent" },
				deps(),
			),
		);
		expect(result.success).toBe(false);
	});
});

describe("memory tool profile", () => {
	test("profile returns user profile", async () => {
		const result = JSON.parse(
			await executeMemoryTool({ mode: "profile" }, deps()),
		);
		expect(result.success).toBe(true);
		expect(result.profile).toBeDefined();
	});
});
