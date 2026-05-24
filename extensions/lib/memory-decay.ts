export interface DecayableEntry {
	key: string;
	value: string;
	createdAt: number;
	accessCount: number;
}

export interface DecayConfig {
	halfLifeDays: number;
}

export class MemoryDecay {
	private halfLifeMs: number;

	constructor(config: DecayConfig) {
		this.halfLifeMs = config.halfLifeDays * 24 * 3600_000;
	}

	score(entry: DecayableEntry): number {
		const ageMs = Date.now() - entry.createdAt;
		const ageDecay = Math.exp((-0.693 * ageMs) / this.halfLifeMs);
		const reinforcement = Math.log(1 + entry.accessCount) / Math.log(2);
		return Math.min(ageDecay * (0.5 + 0.5 * reinforcement), 1.0);
	}
}
