import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SqliteStore } from "./sqlite-store";

const MEM_DIR = join(homedir(), ".pi", "memory");
const JSON_PATH = join(MEM_DIR, "memories.json");
const BAK_PATH = join(MEM_DIR, "memories.json.bak");

interface JsonEntry {
	key: string;
	value: string;
	meta: Record<string, string>;
	vector: number[];
	createdAt: string;
	updatedAt: string;
}

interface JsonStore {
	entries: JsonEntry[];
}

export function needsMigration(): boolean {
	return existsSync(JSON_PATH) && !existsSync(join(MEM_DIR, "memories.db"));
}

export async function migrateFromJson(store: SqliteStore): Promise<number> {
	if (!needsMigration()) return 0;
	const raw = await import("node:fs").then((fs) =>
		fs.readFileSync(JSON_PATH, "utf-8"),
	);
	const data: JsonStore = JSON.parse(raw);
	if (!data?.entries?.length) return 0;
	let count = 0;
	for (const entry of data.entries) {
		await store.put({
			id: entry.key,
			content: entry.value,
			tags: entry.meta?.category ?? undefined,
			category: entry.meta?.category ?? undefined,
		});
		count++;
	}
	renameSync(JSON_PATH, BAK_PATH);
	console.log(
		`[pi-awareness-memory] Migrated ${count} memories from JSON to SQLite`,
	);
	return count;
}
