export class MonthlySummarizer {
	groupByMonth(
		entries: Array<{ key: string; value: string }>,
		month: string,
	): Array<{ key: string; value: string }> {
		const prefix = `daily:${month}-`;
		return entries.filter(e => e.key.startsWith(prefix));
	}

	summarize(
		entries: Array<{ key: string; value: string }>,
		month: string,
	): string {
		const matching = this.groupByMonth(entries, month);
		if (matching.length === 0) {
			return `# Monthly Summary ${month}\nNo entries for this month.`;
		}
		const lines = matching.map(e => `- ${e.value}`).join("\n");
		return `# Monthly Summary ${month}\n${lines}`;
	}
}