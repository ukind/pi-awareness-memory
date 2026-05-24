import type { Embedding } from "./embedding";

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

export class VectorStore {
	private entries = new Map<string, MemoryEntry>();
	private embedder: Embedding;

	constructor(embedder: Embedding) {
		this.embedder = embedder;
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
	}

	async get(
		key: string,
	): Promise<{ value: string; meta: Record<string, string> } | null> {
		const entry = this.entries.get(key);
		return entry ? { value: entry.value, meta: entry.meta } : null;
	}

	async delete(key: string): Promise<void> {
		this.entries.delete(key);
	}

	async search(query: string, topK = 5): Promise<SearchResult[]> {
		if (this.entries.size === 0) return [];
		const queryVec = await this.embedder.embed(query);
		const scored: SearchResult[] = [];
		for (const entry of this.entries.values()) {
			const score = cosineSimilarity(queryVec, entry.vector);
			scored.push({
				key: entry.key,
				value: entry.value,
				meta: entry.meta,
				score,
			});
		}
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0,
		magA = 0,
		magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	const denom = Math.sqrt(magA) * Math.sqrt(magB);
	return denom === 0 ? 0 : dot / denom;
}
