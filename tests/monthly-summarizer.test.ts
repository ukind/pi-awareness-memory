import { describe, it, expect } from "bun:test";
import { MonthlySummarizer } from "../extensions/lib/monthly-summarizer";

describe("MonthlySummarizer", () => {
	it("groups entries by month", () => {
		const entries = [
			{ key: "daily:2025-05-24:abc", value: "I prefer vim" },
			{ key: "daily:2025-05-23:def", value: "Using TypeScript" },
			{ key: "daily:2025-04-15:ghi", value: "Spring project" },
		];
		const summarizer = new MonthlySummarizer();
		const months = summarizer.groupByMonth(entries, "2025-05");
		expect(months.length).toBe(2);
		months.forEach(m => {
			expect(m.key).toMatch(/^daily:2025-05/);
		});
	});

	it("returns empty for no matching entries", () => {
		const summarizer = new MonthlySummarizer();
		const result = summarizer.groupByMonth([], "2025-05");
		expect(result).toEqual([]);
	});

	it("formats summary string", () => {
		const entries = [
			{ key: "daily:2025-05-24:abc", value: "I prefer vim" },
		];
		const summarizer = new MonthlySummarizer();
		const summary = summarizer.summarize(entries, "2025-05");
		expect(summary).toContain("2025-05");
		expect(summary).toContain("prefer vim");
	});
});