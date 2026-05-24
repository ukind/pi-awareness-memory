import { describe, it, expect } from "bun:test";
import { MemoryDecay } from "../extensions/lib/memory-decay";
import type { DecayableEntry } from "../extensions/lib/memory-decay";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe("MemoryDecay", () => {
	it("older memories score lower than recent ones", () => {
		const decay = new MemoryDecay({ halfLifeDays: 30 });
		const recent: DecayableEntry = {
			key: "a",
			value: "recent",
			createdAt: Date.now() - HOUR,
			accessCount: 1,
		};
		const old: DecayableEntry = {
			key: "b",
			value: "old",
			createdAt: Date.now() - 90 * DAY,
			accessCount: 1,
		};
		const recentScore = decay.score(recent);
		const oldScore = decay.score(old);
		expect(recentScore).toBeGreaterThan(oldScore);
	});

	it("frequently accessed memories score higher", () => {
		const decay = new MemoryDecay({ halfLifeDays: 30 });
		const popular: DecayableEntry = {
			key: "a",
			value: "popular",
			createdAt: Date.now() - 30 * DAY,
			accessCount: 10,
		};
		const unpopular: DecayableEntry = {
			key: "b",
			value: "unpopular",
			createdAt: Date.now() - 30 * DAY,
			accessCount: 1,
		};
		expect(decay.score(popular)).toBeGreaterThan(decay.score(unpopular));
	});

	it("reinforced memories decay slower", () => {
		const decay = new MemoryDecay({ halfLifeDays: 30 });
		const reinforced: DecayableEntry = {
			key: "a",
			value: "reinforced",
			createdAt: Date.now() - 60 * DAY,
			accessCount: 5,
		};
		const unreinforced: DecayableEntry = {
			key: "b",
			value: "unreinforced",
			createdAt: Date.now() - 60 * DAY,
			accessCount: 1,
		};
		expect(decay.score(reinforced)).toBeGreaterThan(decay.score(unreinforced));
	});

	it("score is between 0 and 1", () => {
		const decay = new MemoryDecay({ halfLifeDays: 30 });
		const entry: DecayableEntry = {
			key: "x",
			value: "test",
			createdAt: Date.now(),
			accessCount: 100,
		};
		expect(decay.score(entry)).toBeGreaterThan(0);
		expect(decay.score(entry)).toBeLessThanOrEqual(1);
	});

	it("very old memories approach zero", () => {
		const decay = new MemoryDecay({ halfLifeDays: 30 });
		const ancient: DecayableEntry = {
			key: "z",
			value: "ancient",
			createdAt: Date.now() - 365 * DAY,
			accessCount: 1,
		};
		expect(decay.score(ancient)).toBeLessThan(0.1);
	});
});
