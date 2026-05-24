import { describe, it, expect } from "bun:test";
import { formatStatus } from "../extensions/lib/status-formatter";

describe("formatStatus", () => {
	it("shows memory count and config", () => {
		const stats = {
			totalMemories: 42,
			dailyEntries: 15,
			coreLearnings: 8,
			profileFacts: 5,
			port: 4748,
		};
		const status = formatStatus(stats);
		expect(status).toContain("42");
		expect(status).toContain("4748");
	});

	it("shows zero counts cleanly", () => {
		const stats = { totalMemories: 0, dailyEntries: 0, coreLearnings: 0, profileFacts: 0, port: 4748 };
		const status = formatStatus(stats);
		expect(status).toContain("0");
	});
});