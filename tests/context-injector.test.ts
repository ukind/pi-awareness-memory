import { describe, it, expect } from "bun:test";
import { buildContext } from "../extensions/lib/context-injector";

describe("ContextInjector", () => {
	const memories = [
		{ key: "daily:2025-05-24:abc", value: "I prefer using vim for editing", meta: { category: "message" }, score: 0.9 },
		{ key: "daily:2025-05-24:def", value: "My project uses TypeScript and React", meta: { category: "message" }, score: 0.8 },
		{ key: "daily:2025-05-23:ghi", value: "I work on Windows 11", meta: { category: "message" }, score: 0.7 },
	];

	it("builds context from memories", () => {
		const ctx = buildContext(memories, 1000);
		expect(ctx).toBeTruthy();
		expect(ctx.length).toBeGreaterThan(0);
		expect(ctx.length).toBeLessThanOrEqual(1000);
	});

	it("returns empty string for empty memories", () => {
		expect(buildContext([], 1000)).toBe("");
	});

	it("truncates context to maxChars", () => {
		const ctx = buildContext(memories, 50);
		expect(ctx.length).toBeLessThanOrEqual(100);
	});

	it("includes memory content in context", () => {
		const ctx = buildContext(memories, 2000);
		expect(ctx).toContain("vim");
	});
});