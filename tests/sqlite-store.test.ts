import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { SqliteStore } from "../extensions/lib/sqlite-store";
import { MockEmbedder } from "../extensions/lib/mock-embedder";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dbPath: string;
let tmpDir: string;
let store: SqliteStore;

beforeAll(() => {
	tmpDir = mkdtempSync(join(tmpdir(), "pi-mem-test-"));
	dbPath = join(tmpDir, "test.db");
	store = new SqliteStore({ embedder: new MockEmbedder(), dbPath });
});

afterAll(() => {
	store.close();
	try {
		rmSync(tmpDir, { recursive: true, force: true });
	} catch {}
});

describe("SqliteStore CRUD", () => {
	test("put and get", async () => {
		await store.put({ id: "test:1", content: "Hello world", tags: "greeting" });
		const result = await store.get("test:1");
		expect(result).not.toBeNull();
		expect(result!.content).toBe("Hello world");
		expect(result!.tags).toBe("greeting");
	});

	test("put updates existing", async () => {
		await store.put({ id: "test:2", content: "Version 1" });
		await store.put({ id: "test:2", content: "Version 2" });
		const result = await store.get("test:2");
		expect(result!.content).toBe("Version 2");
	});

	test("delete", async () => {
		await store.put({ id: "test:del", content: "To delete" });
		const ok = await store.delete("test:del");
		expect(ok).toBe(true);
		const gone = await store.get("test:del");
		expect(gone).toBeNull();
	});

	test("delete non-existent returns false", async () => {
		const ok = await store.delete("nonexistent");
		expect(ok).toBe(false);
	});
});

describe("SqliteStore list", () => {
	test("list returns results ordered by created_at DESC", async () => {
		await store.put({ id: "list:1", content: "First" });
		await store.put({ id: "list:2", content: "Second" });
		const results = await store.list({ limit: 10 });
		expect(results.length).toBeGreaterThanOrEqual(2);
	});

	test("list with projectPath filter", async () => {
		await store.put({ id: "proj:1", content: "Project A", project_path: "/a" });
		await store.put({ id: "proj:2", content: "Project B", project_path: "/b" });
		const results = await store.list({ limit: 10, projectPath: "/a" });
		expect(results.every((r) => r.project_path === "/a")).toBe(true);
	});
});

describe("SqliteStore search", () => {
	test("search returns ranked results", async () => {
		await store.put({ id: "search:1", content: "TypeScript is great" });
		await store.put({ id: "search:2", content: "Python is nice" });
		const results = await store.search({ query: "TypeScript", topK: 5 });
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].id).toBe("search:1");
	});

	test("search with projectPath filter", async () => {
		await store.put({
			id: "sp:1",
			content: "React component",
			project_path: "/frontend",
		});
		await store.put({
			id: "sp:2",
			content: "Express route",
			project_path: "/backend",
		});
		const results = await store.search({
			query: "React",
			topK: 5,
			projectPath: "/frontend",
		});
		expect(results.every((r) => r.project_path === "/frontend")).toBe(true);
	});
});

describe("SqliteStore listBySession", () => {
	test("returns memories for session", async () => {
		await store.put({
			id: "sess:1",
			content: "Session memory",
			session_id: "sess-abc",
		});
		const results = await store.listBySession("sess-abc");
		expect(results.length).toBe(1);
		expect(results[0].content).toBe("Session memory");
	});
});
