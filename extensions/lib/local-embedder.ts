import type { Embedding } from "./embedding";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const DIMENSION = 384;

export class LocalEmbedder implements Embedding {
	dimension = DIMENSION;
	private pipe: any = null;
	private fallback: MockEmbedder | null = null;
	private loadError: string | null = null;

	private async init(): Promise<any> {
		if (this.pipe) return this.pipe;
		if (this.loadError) {
			// Already failed to load — use fallback
			if (!this.fallback) this.fallback = new MockEmbedder();
			return this.fallback;
		}
		try {
			const { pipeline } = await import("@huggingface/transformers");
			this.pipe = await pipeline("feature-extraction", MODEL_ID, { dtype: "fp32" });
			return this.pipe;
		} catch (e) {
			console.warn("[pi-awareness-memory] Failed to load @huggingface/transformers, falling back to MockEmbedder:", (e as Error).message);
			this.loadError = (e as Error).message;
			if (!this.fallback) this.fallback = new MockEmbedder();
			return this.fallback;
		}
	}

	async embed(text: string): Promise<number[]> {
		const pipe = await this.init();
		if (this.loadError) {
			return this.fallback!.embed(text);
		}
		const output = await pipe(text, { pooling: "mean", normalize: true });
		return Array.from(output.data as Float32Array);
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		const pipe = await this.init();
		if (this.loadError) {
			return this.fallback!.embedBatch(texts);
		}
		const output = await pipe(texts, { pooling: "mean", normalize: true });
		const data = output.data as Float32Array;
		const results: number[][] = [];
		for (let i = 0; i < texts.length; i++) {
			const start = i * DIMENSION;
			results.push(Array.from(data.slice(start, start + DIMENSION)));
		}
		return results;
	}
}

// Inline MockEmbedder as fallback
class MockEmbedder implements Embedding {
	dimension = 8;
	private counter = 0;
	async embed(text: string): Promise<number[]> {
		this.counter++;
		const vec: number[] = [];
		for (let i = 0; i < this.dimension; i++) {
			const c = (text + this.counter).charCodeAt(i % (text + this.counter).length) || 1;
			vec.push(Math.sin(c * (i + 1)) * 0.5 + 0.5);
		}
		const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
		return vec.map((v) => v / mag);
	}
	async embedBatch(texts: string[]): Promise<number[][]> {
		return Promise.all(texts.map((t) => this.embed(t)));
	}
}
