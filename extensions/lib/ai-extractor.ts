import { AutoCapture } from "./auto-capture";

export interface AiExtractorDeps {
	llmCall: (prompt: string, text: string) => Promise<string | null>;
	timeoutMs?: number;
}

export class AiExtractor {
	private capture = new AutoCapture();
	private llmCall: (prompt: string, text: string) => Promise<string | null>;
	private timeoutMs: number;

	constructor(deps: AiExtractorDeps) {
		this.llmCall = deps.llmCall;
		this.timeoutMs = deps.timeoutMs ?? 5000;
	}

	async extractMemories(texts: string[]): Promise<string[]> {
		const combined = texts.join("\n---\n");
		if (combined.length < 20) return [];

		let extracted: string[] = [];
		try {
			const raw = await this.llmWithTimeout(combined);
			if (raw) {
				extracted = raw
					.split("\n")
					.map((s) => s.replace(/^[-*]\s*/, ""))
					.filter((s) => s.length >= 20);
			}
		} catch {
			// LLM unavailable — fall through to pattern-based
		}

		if (extracted.length === 0) {
			extracted = this.fallbackExtract(combined);
		}
		return extracted.filter((s) => s.length >= 20);
	}

	private llmWithTimeout(text: string): Promise<string | null> {
		return new Promise<string | null>((resolve, _reject) => {
			const timer = setTimeout(() => resolve(null), this.timeoutMs);
			this.llmCall(
				"Extract discrete memory-worthy facts from this conversation. Return one fact per line, each at least 20 characters. Strip small talk, greetings, and filler.",
				text,
			)
				.then((r) => {
					clearTimeout(timer);
					resolve(r);
				})
				.catch(() => {
					clearTimeout(timer);
					resolve(null);
				});
		});
	}

	private fallbackExtract(text: string): string[] {
		const sentences = text
			.split(/[.!?\n]+/)
			.map((s) => s.trim())
			.filter((s) => s.length >= 20 && this.capture.shouldCapture(s));
		return sentences;
	}
}
