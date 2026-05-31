import { Database } from "bun:sqlite";

export interface ConnectionOptions {
	path: string;
	create?: boolean;
}

export class ConnectionManager {
	public db: Database;
	private retryMax = 3;
	private baseDelayMs = 100;

	constructor(opts: ConnectionOptions) {
		this.db = new Database(opts.path, { create: opts.create ?? true });
	}

	run(sql: string, ...params: any[]) {
		return this.retry(() => this.db.run(sql, ...params));
	}

	prepare(sql: string) {
		return this.db.prepare(sql);
	}

	exec(sql: string) {
		return this.retry(() => this.db.exec(sql));
	}

	transaction(fn: () => void) {
		return this.db.transaction(fn);
	}

	private retry<T>(fn: () => T): T {
		for (let attempt = 1; attempt <= this.retryMax; attempt++) {
			try {
				return fn();
			} catch (e: any) {
				if (e?.code === "SQLITE_BUSY" && attempt < this.retryMax) {
					const delay = this.baseDelayMs * 2 ** (attempt - 1);
					Bun.sleepSync(delay);
					continue;
				}
				throw e;
			}
		}
		throw new Error("SQLITE_BUSY: max retries exhausted");
	}

	maybeCheckpoint(walPageThreshold = 1000) {
		try {
			this.db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
			const pages = this.db
				.prepare("SELECT * FROM pragma_wal_checkpoint")
				.get() as any;
			if (pages?.wal_size && pages.wal_size > walPageThreshold) {
				this.db.run("PRAGMA wal_checkpoint(TRUNCATE)");
			}
		} catch {
			// checkpoint is advisory
		}
	}

	close() {
		this.db.close();
	}
}
