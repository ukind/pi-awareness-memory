import { MemoryDecay, type DecayableEntry } from "./memory-decay";

interface LearningEntry {
	key: string;
	value: string;
	createdAt: number;
	accessCount: number;
}

export interface ScoredLearning {
	key: string;
	value: string;
	score: number;
}

export class CoreProfile {
	private entries = new Map<string, LearningEntry>();
	private decay = new MemoryDecay({ halfLifeDays: 30 });

	addLearning(key: string, value: string): void {
		const existing = this.entries.get(key);
		if (existing) {
			existing.accessCount++;
			existing.value = value;
			return;
		}
		this.entries.set(key, {
			key, value,
			createdAt: Date.now(),
			accessCount: 1,
		});
	}

	scoredCore(topK: number): ScoredLearning[] {
		const scored: ScoredLearning[] = [];
		for (const entry of this.entries.values()) {
			const decayEntry: DecayableEntry = {
				key: entry.key,
				value: entry.value,
				createdAt: entry.createdAt,
				accessCount: entry.accessCount,
			};
			const score = this.decay.score(decayEntry);
			scored.push({ key: entry.key, value: entry.value, score });
		}
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
}