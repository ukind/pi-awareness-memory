import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DATA_DIR = join(homedir(), ".pi", "memory");
const STORE_FILE = join(DATA_DIR, "memories.json");
const PROFILE_FILE = join(DATA_DIR, "profile.json");

function ensureDir(): void {
	mkdirSync(DATA_DIR, { recursive: true });
}

export function loadFromDisk<T>(filename: string): T | null {
	try {
		const raw = readFileSync(filename, "utf-8");
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export function saveToDisk(filename: string, data: unknown): void {
	ensureDir();
	writeFileSync(filename, JSON.stringify(data, null, 2), "utf-8");
}

export const STORE_PATH = STORE_FILE;
export const PROFILE_PATH = PROFILE_FILE;