import { DatabaseSync } from "node:sqlite";

export interface ConnectionOptions {
	path: string;
	create?: boolean;
}

export class ConnectionManager {
	public db: DatabaseSync;
	private retryMax = 3;
	private baseDelayMs = 100;

	constructor(opts: ConnectionOptions) {
		this.db = new DatabaseSync(opts.path);
	}

	run(sql: string, ...params: any[]) {
		return this.retry(() => this.db.prepare(sql).run(...params));
	}

	prepare(sql: string) {
		return this.db.prepare(sql);
	}

	exec(sql: string) {
		return this.retry(() => this.db.exec(sql));
	}

	transaction(fn: () => void) {
		return () => {
			this.db.exec("BEGIN");
			try {
				fn();
				this.db.exec("COMMIT");
			} catch (e) {
				try {
					this.db.exec("ROLLBACK");
				} catch {}
				throw e;
			}
		};
	}

	private retry<T>(fn: () => T): T {
		for (let attempt = 1; attempt <= this.retryMax; attempt++) {
			try {
				return fn();
			} catch (e: any) {
				if (e?.errcode === 5 && attempt < this.retryMax) {
					const delay = this.baseDelayMs * 2 ** (attempt - 1);
					Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
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
			if (pages?.log && pages.log > walPageThreshold) {
				this.db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").run();
			}
		} catch {
			// checkpoint is advisory
		}
	}

	close() {
		this.db.close();
	}
}
