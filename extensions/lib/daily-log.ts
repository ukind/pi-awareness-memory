import { simpleHash } from "./auto-capture";

export class DailyLog {
	makeDailyKey(text: string, messageCount: number): string | null {
		if (messageCount % 2 !== 1) return null;
		const date = new Date().toISOString().slice(0, 10);
		const hash = simpleHash(text);
		return `daily:${date}:${hash}`;
	}
}