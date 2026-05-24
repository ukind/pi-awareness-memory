import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MemoryServer } from "../extensions/lib/memory-server";
import { VectorStore } from "../extensions/lib/vector-store";
import { UserProfile } from "../extensions/lib/user-profile";
import { MockEmbedder } from "../extensions/lib/mock-embedder";

describe("MemoryServer", () => {
	let server: MemoryServer;
	let baseUrl: string;
	let store: VectorStore;
	let profile: UserProfile;

	beforeAll(async () => {
		const embedder = new MockEmbedder();
		store = new VectorStore(embedder);
		profile = new UserProfile();
		server = new MemoryServer({ port: 14748, store, profile });
		baseUrl = await server.start();
	});

	afterAll(() => {
		server.stop();
	});

	it("serves HTML at root endpoint", async () => {
		const res = await fetch(baseUrl + "/");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("<html");
	});

	it("returns memories as JSON at /api/memories", async () => {
		await store.put("test.key", "test value", { category: "test" });
		const res = await fetch(baseUrl + "/api/memories");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBeGreaterThan(0);
		expect(data[0].key).toBe("test.key");
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
