import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MemoryServer } from "../extensions/lib/memory-server";
import { SqliteStore } from "../extensions/lib/sqlite-store";
import { UserProfile } from "../extensions/lib/user-profile";
import { MockEmbedder } from "../extensions/lib/mock-embedder";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("MemoryServer", () => {
	let server: MemoryServer;
	let baseUrl: string;
	let store: SqliteStore;
	let profile: UserProfile;
	let tmpDir: string;

	beforeAll(async () => {
		tmpDir = mkdtempSync(join(tmpdir(), "pi-srv-test-"));
		store = new SqliteStore({
			embedder: new MockEmbedder(),
			dbPath: join(tmpDir, "test.db"),
		});
		profile = new UserProfile();
		server = new MemoryServer({ port: 0, store, profile });
		baseUrl = await server.start();
	});

	afterAll(() => {
		server.stop();
		store.close();
		try {
			rmSync(tmpDir, { recursive: true, force: true });
		} catch {}
	});

	it("serves HTML at root endpoint", async () => {
		const res = await fetch(baseUrl + "/");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("<html");
	});

	it("returns memories as JSON at /api/memories", async () => {
		await store.put({
			id: "test.key",
			content: "test value",
			category: "test",
		});
		const res = await fetch(baseUrl + "/api/memories");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBeGreaterThan(0);
	});

	it("returns profile as JSON at /api/profile", async () => {
		profile.addFact("pref.editor", "vim");
		const res = await fetch(baseUrl + "/api/profile");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.preferences.editor).toBe("vim");
	});

	it("searches memories at /api/memories?q=", async () => {
		const res = await fetch(baseUrl + "/api/memories?q=test");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data)).toBe(true);
	});
});
