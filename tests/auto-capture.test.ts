import { describe, it, expect } from "bun:test";
import { AutoCapture, type ExtractedFact } from "../auto-capture";

describe("AutoCapture", () => {
	it("extracts facts from conversation text", async () => {
		const capture = new AutoCapture();
		const text = "I prefer using vim for editing code. My OS is Windows 11.";
		const facts: ExtractedFact[] = await capture.extract(text);
		expect(facts.length).toBeGreaterThan(0);
		expect(
			facts.some((f) => f.key.includes("pref") || f.key.includes("editor")),
		).toBe(true);
	});

	it("deduplicates facts against existing keys", async () => {
		const capture = new AutoCapture();
		const existing = [{ key: "pref.editor", value: "vim" }];
		const facts: ExtractedFact[] = await capture.extract(
			"I prefer vim for editing",
			existing,
		);
		const dupes = facts.filter((f) => f.key === "pref.editor");
		expect(dupes.length).toBe(0);
	});

	it("filters noise and trivial facts", async () => {
		const capture = new AutoCapture();
		const facts: ExtractedFact[] = await capture.extract(
			"OK sure, yeah let's do that",
		);
		expect(facts.length).toBe(0);
	});

	it("extracts project context", async () => {
		const capture = new AutoCapture();
		const text = "This project uses React with TypeScript and runs on Node 20.";
		const facts: ExtractedFact[] = await capture.extract(text);
		expect(facts.length).toBeGreaterThan(0);
		expect(facts.some((f) => f.key.includes("project"))).toBe(true);
	});

	it("assigns confidence scores", async () => {
		const capture = new AutoCapture();
		const facts: ExtractedFact[] = await capture.extract("My name is Alice");
		expect(facts.length).toBeGreaterThan(0);
		expect(facts[0].confidence).toBeGreaterThan(0);
		expect(facts[0].confidence).toBeLessThanOrEqual(1);
	});
});
