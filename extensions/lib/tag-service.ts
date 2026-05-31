import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

function sha256short(input: string): string {
	return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function runGit(args: string, cwd?: string): string {
	try {
		return execSync(`git ${args}`, {
			encoding: "utf-8",
			cwd,
			timeout: 3000,
		}).trim();
	} catch {
		return "";
	}
}

export interface TagInfo {
	user_tag: string;
	project_tag: string;
	repo_tag: string;
}

export function getUserTag(cwd?: string): string {
	const email = runGit("config user.email", cwd);
	if (email) return `mem_user_${sha256short(email)}`;
	const name = runGit("config user.name", cwd);
	if (name) return `mem_user_${sha256short(name)}`;
	const fallback = process.env.USER || process.env.USERNAME || "anonymous";
	return `mem_user_${sha256short(fallback)}`;
}

export function getProjectTag(cwd?: string): string {
	const gitCommonDir = runGit("rev-parse --git-common-dir", cwd);
	if (gitCommonDir && existsSync(gitCommonDir)) {
		return `mem_project_${sha256short(gitCommonDir)}`;
	}
	const dir = cwd || process.cwd();
	return `mem_project_${sha256short(dir.replace(/\\/g, "/"))}`;
}

export function getRepoTag(cwd?: string): string {
	const url = runGit("config remote.origin.url", cwd);
	if (url) return `mem_repo_${sha256short(url)}`;
	return "";
}

export function getTags(cwd?: string): TagInfo {
	return {
		user_tag: getUserTag(cwd),
		project_tag: getProjectTag(cwd),
		repo_tag: getRepoTag(cwd),
	};
}

export function computeContentHash(content: string): string {
	return sha256short(content);
}
