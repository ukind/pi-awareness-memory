import { describe, it, expect } from "bun:test";
import { MockEmbedder } from "../mock-embedder";

describe("MockEmbedder", () => {
	it("returns vector of correct dimension", async () => {
		const emb = new MockEmbedder();
		const vec = await emb.embed("hello");
		expect(vec.length).toBe(8);
	});

	it("returns normalized vectors", async () => {
		const emb = new MockEmbedder();
		const vec = await emb.embed("test");
		const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
		expect(Math.abs(mag - 1.0)).toBeLessThan(0.01);
	});

	it("embedBatch returns correct count", async () => {
		const emb = new MockEmbedder();
		const vecs = await emb.embedBatch(["a", "b", "c"]);
		expect(vecs.length).toBe(3);
		expect(vecs[0].length).toBe(8);
	});
});
