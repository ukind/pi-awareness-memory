import { describe, it, expect } from "bun:test";
import { DailyLog } from "../extensions/lib/daily-log";

describe("DailyLog", () => {
	const log = new DailyLog();

	it("creates daily entry with date-prefixed key on odd messages", () => {
		const key = log.makeDailyKey("I prefer using vim for editing", 1);
		expect(key).toMatch(/^daily:\d{4}-\d{2}-\d{2}:/);
	});

	it("returns null key on even messages (should not capture)", () => {
		const key = log.makeDailyKey("some message", 2);
		expect(key).toBeNull();
	});

	it("returns null key on message 0 (should not capture)", () => {
		const key = log.makeDailyKey("some message", 0);
		expect(key).toBeNull();
	});

	it("captures on messages 1, 3, 5 (odd)", () => {
		expect(log.makeDailyKey("msg", 1)).toBeTruthy();
		expect(log.makeDailyKey("msg", 3)).toBeTruthy();
		expect(log.makeDailyKey("msg", 5)).toBeTruthy();
	});

	it("skips on messages 2, 4, 6 (even)", () => {
		expect(log.makeDailyKey("msg", 2)).toBeNull();
		expect(log.makeDailyKey("msg", 4)).toBeNull();
		expect(log.makeDailyKey("msg", 6)).toBeNull();
	});

	it("includes date in YYYY-MM-DD format", () => {
		const today = new Date().toISOString().slice(0, 10);
		const key = log.makeDailyKey("test message", 1);
		expect(key).toContain(today);
	});
});