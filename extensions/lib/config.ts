export interface MemoryConfig {
	port: number;
	maxContextChars: number;
	topK: number;
	captureMinLength: number;
	halfLifeDays: number;
}

export const DEFAULT_CONFIG: MemoryConfig = {
	port: 4748,
	maxContextChars: 12000,
	topK: 5,
	captureMinLength: 20,
	halfLifeDays: 30,
};

export function loadConfig(
	overrides: Partial<MemoryConfig>,
): MemoryConfig {
	return { ...DEFAULT_CONFIG, ...overrides };
}