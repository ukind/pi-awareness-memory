import type { Embedding } from "./embedding";
import { loadFromDisk, saveToDisk, STORE_PATH } from "./persistence";
import { BackendFactory } from "./vector-backends";

interface MemoryEntry {
	key: string;
	value: string;
	meta: Record<string, string>;
	vector: number[];
	createdAt: string;
	updatedAt: string;
}

interface SearchResult {
	key: string;
	value: string;
	meta: Record<string, string>;
	score: number;
}

interface SerializedStore {
	entries: MemoryEntry[];
}

export class VectorStore {
	private entries = new Map<string, MemoryEntry>();
	private embedder: Embedding;
	private backend: BackendFactory;

	constructor(embedder: Embedding) {
		this.embedder = embedder;
		this.backend = new BackendFactory();
	}

	loadFromDisk(): number {
		const data = loadFromDisk<SerializedStore>(STORE_PATH);
		if (!data?.entries) return 0;
		this.entries.clear();
		for (const entry of data.entries) {
			this.entries.set(entry.key, entry);
		}
		return this.entries.size;
	}

	saveToDisk(): void {
		const data: SerializedStore = {
			entries: Array.from(this.entries.values()),
		};
		saveToDisk(STORE_PATH, data);
	}

	async put(
		key: string,
		value: string,
		meta: Record<string, string>,
	): Promise<void> {
		const vector = await this.embedder.embed(value);
		const now = new Date().toISOString();
		const existing = this.entries.get(key);
		this.entries.set(key, {
			key,
			value,
			meta,
			vector,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		});
		this.saveToDisk();
	}

	async get(
		key: string,
	): Promise<{ value: string; meta: Record<string, string> } | null> {
		const entry = this.entries.get(key);
		return entry ? { value: entry.value, meta: entry.meta } : null;
	}

	async delete(key: string): Promise<void> {
		this.entries.delete(key);
		this.saveToDisk();
	}

	async search(query: string, topK = 5): Promise<SearchResult[]> {
		if (this.entries.size === 0) return [];
		if (query.trim() === "") {
			return Array.from(this.entries.values())
				.map((e) => ({
					key: e.key,
					value: e.value,
					meta: e.meta,
					score: 1.0,
				}))
				.slice(0, topK);
		}
		const queryVec = await this.embedder.embed(query);
		const vectors = Array.from(this.entries.values()).map((e) => e.vector);
		const results = await this.backend.search(queryVec, vectors, topK);
		const entryArray = Array.from(this.entries.values());
		return results.map((r) => {
			const entry = entryArray[parseInt(r.key)];
			return {
				key: entry.key,
				value: entry.value,
				meta: entry.meta,
				score: r.score,
			};
		});
	}
}
