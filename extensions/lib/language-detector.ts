const CJK = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;
const CJK_THRESHOLD = 0.3;

export type LangLabel = "en" | "ja" | "zh" | "ko";

export function detectLanguage(text: string): LangLabel {
	const cjkCount = (text.match(CJK) || []).length;
	const total = text.replace(/\s/g, "").length || 1;
	if (cjkCount / total >= CJK_THRESHOLD) {
		if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
		if (/[\uac00-\ud7af]/.test(text)) return "ko";
		return "zh";
	}
	return "en";
}

export class LanguageTracker {
	private history: LangLabel[] = [];
	private current: LangLabel = "en";
	private switchThreshold = 3;

	feed(text: string): LangLabel {
		const lang = detectLanguage(text);
		this.history.push(lang);
		if (this.history.length > 20) this.history.shift();
		const recent = this.history.slice(-this.switchThreshold);
		if (recent.every((l) => l === lang && l !== this.current)) {
			this.current = lang;
		}
		return this.current;
	}

	getCurrent(): LangLabel {
		return this.current;
	}
}
