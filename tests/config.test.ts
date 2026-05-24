import { describe, it, expect } from "bun:test";
import { loadConfig, DEFAULT_CONFIG } from "../extensions/lib/config";

describe("loadConfig", () => {
	it("returns defaults with no input", () => {
		const config = loadConfig({});
		expect(config.port).toBe(DEFAULT_CONFIG.port);
		expect(config.maxContextChars).toBe(DEFAULT_CONFIG.maxContextChars);
		expect(config.topK).toBe(DEFAULT_CONFIG.topK);
	});

	it("overrides defaults with provided values", () => {
		const config = loadConfig({ port: 9999, topK: 3 });
		expect(config.port).toBe(9999);
		expect(config.topK).toBe(3);
		expect(config.maxContextChars).toBe(DEFAULT_CONFIG.maxContextChars);
	});

	it("has sensible defaults", () => {
		expect(DEFAULT_CONFIG.port).toBe(4748);
		expect(DEFAULT_CONFIG.topK).toBeGreaterThan(0);
		expect(DEFAULT_CONFIG.maxContextChars).toBeGreaterThan(0);
	});
});