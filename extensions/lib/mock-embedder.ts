import type { Embedding } from "./embedding";

/** Deterministic mock embedder for tests. Zero API calls. */
export class MockEmbedder implements Embedding {
	dimension = 8;
	private counter = 0;

	async embed(text: string): Promise<number[]> {
		this.counter++;
		return this.hashVector(text + this.counter);
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		return Promise.all(texts.map((t) => this.embed(t)));
	}

	/** Deterministic vector from string hash. */
	private hashVector(input: string): number[] {
		const vec: number[] = [];
		for (let i = 0; i < this.dimension; i++) {
			const charCode = input.charCodeAt(i % input.length) || 1;
			vec.push(Math.sin(charCode * (i + 1)) * 0.5 + 0.5);
		}
		// Normalize
		const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
		return vec.map((v) => v / mag);
	}
}
