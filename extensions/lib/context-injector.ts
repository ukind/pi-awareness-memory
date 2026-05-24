const HEADER = "# Memory Context\nUse this as historical evidence.\n";

export function buildContext(
	memories: Array<{ key: string; value: string; score?: number }>,
	maxChars: number,
): string {
	if (memories.length === 0) return "";
	const lines: string[] = [HEADER];
	for (const m of memories) {
		const line = `- ${m.value}`;
		if (lines.join("\n").length + line.length > maxChars) break;
		lines.push(line);
	}
	return lines.join("\n");
}