declare module "node:sqlite" {
	export class DatabaseSync {
		constructor(path: string);
		prepare(sql: string): StatementSync;
		exec(sql: string): void;
		close(): void;
	}

	export class StatementSync {
		get(...params: any[]): any;
		all(...params: any[]): any[];
		run(...params: any[]): { changes: number; lastInsertRowid: number };
	}
}
