export interface ExtractedFact {
	key: string;
	value: string;
	confidence: number;
	category: string;
}

interface ExistingKey {
	key: string;
	value: string;
}

const NOISE_PATTERNS = [
	/^(ok|sure|yeah|yes|no|nope|yep|yup|lol|hmm|um|uh)[\s!.?]*$/i,
	/^(let's|lets|okay|alright|got it|right|cool|nice|great|good)[\s!.?]*$/i,
];

const FACT_PATTERNS: Array<{
	pattern: RegExp;
	keyBuilder: (m: RegExpMatchArray) => string;
	category: string;
	confidence: number;
}> = [
	// Preferences: "I prefer X", "I use X", "I like X"
	{
		pattern: /I\s+(?:prefer|use|like|love)\s+(.+?)(?:\.|,|$)/i,
		keyBuilder: () => "pref",
		category: "preference",
		confidence: 0.85,
	},
	// OS: "My OS is X", "I run X"
	{
		pattern: /(?:my\s+OS\s+is|I\s+run|running)\s+(.+?)(?:\.|,|$)/i,
		keyBuilder: () => "user.os",
		category: "environment",
		confidence: 0.9,
	},
	// Editor: "I use X for editing"
	{
		pattern: /(?:use|prefer)\s+(\w+)\s+for\s+edit/i,
		keyBuilder: () => "pref.editor",
		category: "preference",
		confidence: 0.85,
	},
	// Project: "This project uses X"
	{
		pattern:
			/(?:this\s+)?project\s+(?:uses|runs on|is built with)\s+(.+?)(?:\.|,|$)/i,
		keyBuilder: () => "project",
		category: "project",
		confidence: 0.9,
	},
	// Name: "My name is X", "I am X", "Call me X"
	{
		pattern: /(?:my\s+name\s+is|I\s+am|call\s+me)\s+(\w+)/i,
		keyBuilder: () => "user.name",
		category: "identity",
		confidence: 0.9,
	},
	// General: "X is Y"
	{
		pattern: /(\w[\w\s]*?)\s+is\s+([\w\s.]+?)(?:\.|,|$)/i,
		keyBuilder: (m) => m[1].trim().replace(/\s+/g, ".").toLowerCase(),
		category: "fact",
		confidence: 0.7,
	},
];

export class AutoCapture {
	async extract(
		text: string,
		existing: ExistingKey[] = [],
	): Promise<ExtractedFact[]> {
		const trimmed = text.trim();
		if (!trimmed || this.isNoise(trimmed)) return [];
		const existingKeys = new Set(existing.map((e) => e.key));
		const facts: ExtractedFact[] = [];
		for (const { pattern, keyBuilder, category, confidence } of FACT_PATTERNS) {
			const match = trimmed.match(pattern);
			if (!match) continue;
			const key = keyBuilder(match);
			if (existingKeys.has(key)) continue;
			if (facts.some((f) => f.key === key)) continue;
			facts.push({ key, value: trimmed, confidence, category });
		}
		return facts;
	}

	private isNoise(text: string): boolean {
		return NOISE_PATTERNS.some((p) => p.test(text));
	}
}
