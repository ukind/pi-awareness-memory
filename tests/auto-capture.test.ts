import { describe, it, expect } from "bun:test";
import { AutoCapture } from "../extensions/lib/auto-capture";

describe("AutoCapture", () => {
	const capture = new AutoCapture();

	it("should capture long enough messages", () => {
		expect(capture.shouldCapture("I prefer using vim for editing code")).toBe(true);
		expect(capture.shouldCapture("My project uses TypeScript and React")).toBe(true);
	});

	it("rejects short messages", () => {
		expect(capture.shouldCapture("ok")).toBe(false);
		expect(capture.shouldCapture("yes")).toBe(false);
		expect(capture.shouldCapture("short")).toBe(false);
	});

	it("rejects noise phrases", () => {
		expect(capture.shouldCapture("ok sure yeah")).toBe(false);
		expect(capture.shouldCapture("great")).toBe(false);
	});

	it("generates unique keys", () => {
		const key1 = capture.makeKey("hello world test");
		const key2 = capture.makeKey("different message here");
		expect(key1).toBeTruthy();
		expect(key2).toBeTruthy();
		expect(key1).not.toBe(key2);
	});

	it("generates prefixed keys", () => {
		const key = capture.makeKey("some text");
		expect(key.startsWith("msg:")).toBe(true);
	});
});