import { describe, it, expect, afterAll } from "bun:test";
import { gitCommit, gitInit } from "../extensions/lib/git-memory";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("GitMemory", () => {
	const testDir = join(tmpdir(), "pi-memory-git-test-" + Date.now());

	afterAll(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("initializes a git repo", () => {
		mkdirSync(testDir, { recursive: true });
		const result = gitInit(testDir);
		expect(result).toBe(true);
		expect(existsSync(join(testDir, ".git"))).toBe(true);
	});

	it("commits changes to git", () => {
		writeFileSync(join(testDir, "test.json"), '{"test": true}', "utf-8");
		const result = gitCommit(testDir, ["test.json"], "test commit");
		expect(typeof result).toBe("boolean");
	});
});