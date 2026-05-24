/**
 * Embedding provider interface.
 * Swappable — local ONNX, API-based, or mock for tests.
 */
export interface Embedding {
	/** Embed a single string. Returns float array. */
	embed(text: string): Promise<number[]>;
	/** Embed multiple strings in batch. */
	embedBatch(texts: string[]): Promise<number[][]>;
	/** Vector dimensionality. */
	dimension: number;
}
