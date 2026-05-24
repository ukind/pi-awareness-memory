import { pipeline, type Pipeline } from "@huggingface/transformers";
import type { Embedding } from "./embedding";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const DIMENSION = 384;

export class LocalEmbedder implements Embedding {
	dimension = DIMENSION;
	private pipe: Pipeline | null = null;

	private async init(): Promise<Pipeline> {
		if (!this.pipe) {
			this.pipe = await pipeline("feature-extraction", MODEL_ID, {
				dtype: "fp32",
			});
		}
		return this.pipe;
	}

	async embed(text: string): Promise<number[]> {
		const pipe = await this.init();
		const output = await pipe(text, { pooling: "mean", normalize: true });
		return Array.from(output.data as Float32Array);
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		const pipe = await this.init();
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
