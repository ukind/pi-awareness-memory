export interface SearchResult {
	key: string;
	score: number;
}

export interface VectorBackend {
	search(
		queryVector: number[],
		vectors: number[][],
		topK: number,
	): SearchResult[];
}

export class CosineBackend implements VectorBackend {
	search(
		queryVector: number[],
		vectors: number[][],
		topK: number,
	): SearchResult[] {
		const scored = vectors.map((vec, i) => ({
			key: String(i),
			score: cosineSimilarity(queryVector, vec),
		}));
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
}

export class BackendFactory {
	private primary: VectorBackend;
	private fallback: VectorBackend;

	constructor(primary?: VectorBackend) {
		this.fallback = new CosineBackend();
		this.primary = primary ?? this.fallback;
	}

	getBackend(): VectorBackend {
		return this.primary;
	}

	async search(
		queryVector: number[],
		vectors: number[][],
		topK: number,
	): Promise<SearchResult[]> {
		try {
			return this.primary.search(queryVector, vectors, topK);
		} catch {
			return this.fallback.search(queryVector, vectors, topK);
		}
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
	return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}
