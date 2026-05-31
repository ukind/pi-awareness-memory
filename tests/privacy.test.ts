import { describe, test, expect } from "bun:test";
import { stripPrivateContent, isFullyPrivate } from "../extensions/lib/privacy";

describe("stripPrivateContent", () => {
	test("strips <private> tags", () => {
		expect(
			stripPrivateContent("My key is <private>sk-abc123</private> for OpenAI"),
		).toBe("My key is [REDACTED] for OpenAI");
	});
	test("strips multiple private blocks", () => {
		expect(
			stripPrivateContent("A <private>1</private> B <private>2</private> C"),
		).toBe("A [REDACTED] B [REDACTED] C");
	});
	test("no private tags returns unchanged", () => {
		expect(stripPrivateContent("Hello world")).toBe("Hello world");
	});
	test("case insensitive", () => {
		expect(stripPrivateContent("Secret <PRIVATE>abc</PRIVATE> here")).toBe(
			"Secret [REDACTED] here",
		);
	});
	test("multiline private content", () => {
		expect(
			stripPrivateContent("Before <private>line1\nline2</private> after"),
		).toBe("Before [REDACTED] after");
	});
});

describe("isFullyPrivate", () => {
	test("fully private content returns true", () => {
		expect(isFullyPrivate("<private>secret</private>")).toBe(true);
	});
	test("mixed content returns false", () => {
		expect(isFullyPrivate("My key is <private>sk-abc</private>")).toBe(false);
	});
	test("empty after stripping returns true", () => {
		expect(isFullyPrivate("   <private>abc</private>   ")).toBe(true);
	});
	test("no private tags returns false", () => {
		expect(isFullyPrivate("Normal text")).toBe(false);
	});
});
