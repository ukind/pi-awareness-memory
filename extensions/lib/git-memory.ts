import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function runGit(cwd: string, args: string[]): boolean {
	const result = spawnSync("git", args, { cwd, timeout: 5000 });
	return result.status === 0;
}

export function gitInit(dir: string): boolean {
	if (existsSync(`${dir}/.git`)) return true;
	runGit(dir, ["init"]);
	return existsSync(`${dir}/.git`);
}

export function gitCommit(
	dir: string,
	files: string[],
	message: string,
): boolean {
	runGit(dir, ["add", ...files]);
	const status = spawnSync("git", ["status", "--porcelain"], {
		cwd: dir, timeout: 3000,
	});
	if (!status.stdout?.toString().trim()) return true;
	return runGit(dir, ["commit", "-m", message]);
}