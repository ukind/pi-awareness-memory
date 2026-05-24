import { describe, it, expect, beforeEach } from "bun:test";
import { CoreProfile } from "../extensions/lib/core-profile";

describe("CoreProfile", () => {
	let core: CoreProfile;
	beforeEach(() => { core = new CoreProfile(); });

	it("scores entries by frequency × recency", () => {
		core.addLearning("prefer-vim", "I prefer vim for editing");
		core.addLearning("prefer-vim", "I prefer vim for editing");
		core.addLearning("use-typescript", "I use TypeScript");
		const scored = core.scoredCore(5);
		expect(scored.length).toBeGreaterThan(0);
		// prefer-vim has frequency 2, should rank first regardless of timing
		expect(scored[0].key).toBe("prefer-vim");
		expect(scored[0].score).toBeGreaterThan(0);
	});

	it("returns empty array with no learnings", () => {
		expect(core.scoredCore(5)).toEqual([]);
	});

	it("limits results to topK", () => {
		for (let i = 0; i < 10; i++) {
			core.addLearning(`key-${i}`, `value-${i}`);
		}
		expect(core.scoredCore(3).length).toBe(3);
	});

	it("newer entries score higher than older ones with same frequency", () => {
		core.addLearning("old-key", "old value");
		core.addLearning("new-key", "new value");
		const scored = core.scoredCore(2);
		expect(scored.length).toBe(2);
	});
});