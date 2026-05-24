import { describe, it, expect, beforeEach } from "bun:test";
import { VectorStore } from "../vector-store";
import { MockEmbedder } from "../mock-embedder";
import type { Embedding } from "../embedding";

describe("VectorStore", () => {
	let store: VectorStore;
	let embedder: Embedding;

	beforeEach(() => {
		embedder = new MockEmbedder();
		store = new VectorStore(embedder);
	});

	it("stores and retrieves a memory by key", async () => {
		await store.put("user.os", "Windows 11 with Bun", { source: "user" });
		const result = await store.get("user.os");
		expect(result).not.toBeNull();
		expect(result?.value).toBe("Windows 11 with Bun");
		expect(result?.meta.source).toBe("user");
	});

	it("returns null for missing key", async () => {
		const result = await store.get("nonexistent");
		expect(result).toBeNull();
	});

	it("searches semantically and returns ranked results", async () => {
		await store.put("pref.editor", "uses vim for editing", { source: "user" });
		await store.put("pref.os", "runs Windows 11", { source: "user" });
		await store.put("project.lang", "TypeScript project", { source: "system" });

		const results = await store.search("text editor preference");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].score).toBeGreaterThan(0);
		expect(results[0].value).toBeDefined();
	});

	it("deletes a memory by key", async () => {
		await store.put("temp.key", "temporary value", {});
		await store.delete("temp.key");
		const result = await store.get("temp.key");
		expect(result).toBeNull();
	});

	it("updates existing key", async () => {
		await store.put("user.os", "Windows 10", {});
		await store.put("user.os", "Windows 11", {});
		const result = await store.get("user.os");
		expect(result?.value).toBe("Windows 11");
	});

	it("search returns empty for empty store", async () => {
		const results = await store.search("anything");
		expect(results).toEqual([]);
	});
});
