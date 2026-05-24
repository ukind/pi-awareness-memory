interface StatusStats {
	totalMemories: number;
	dailyEntries: number;
	coreLearnings: number;
	profileFacts: number;
	port: number;
}

export function formatStatus(stats: StatusStats): string {
	return [
		"📊 Memory Status",
		`  Total memories: ${stats.totalMemories}`,
		`  Daily entries: ${stats.dailyEntries}`,
		`  Core learnings: ${stats.coreLearnings}`,
		`  Profile facts: ${stats.profileFacts}`,
		`  Dashboard: http://localhost:${stats.port}`,
	].join("\n");
}