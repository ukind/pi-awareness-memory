import type { ConnectionManager } from "./connection-manager";
import { CosineBackend } from "./vector-backends";

export interface DedupDeps {
	conn: ConnectionManager;
}

export class DeduplicationService {
	private conn: ConnectionManager;
	private backend = new CosineBackend();
	private isRunning = false;

	constructor(deps: DedupDeps) {
		this.conn = deps.conn;
	}

	async deduplicate(): Promise<{ exact: number; near: number }> {
		if (this.isRunning) return { exact: 0, near: 0 };
		this.isRunning = true;
		try {
			const exact = await this.dedupExact();
			const near = await this.dedupNear();
			return { exact, near };
		} finally {
			this.isRunning = false;
		}
	}

	private async dedupExact(): Promise<number> {
		const rows = this.conn
			.prepare(
				"SELECT content_hash, COUNT(*) as cnt FROM memories WHERE content_hash IS NOT NULL GROUP BY content_hash HAVING cnt > 1",
			)
			.all() as any[];
		let removed = 0;
		const deleteStmt = this.conn.prepare("DELETE FROM memories WHERE id = ?");
		for (const row of rows) {
			const dupes = this.conn
				.prepare(
					"SELECT id, created_at FROM memories WHERE content_hash = ? ORDER BY created_at DESC",
				)
				.all(row.content_hash) as any[];
			for (let i = 1; i < dupes.length; i++) {
				deleteStmt.run(dupes[i].id);
				removed++;
			}
		}
		return removed;
	}

	private async dedupNear(): Promise<number> {
		const BATCH = 1000;
		const threshold = 0.92;
		const toDelete = new Set<string>();
		let offset = 0;
		while (true) {
			const rows = this.conn
				.prepare(
					"SELECT id, vector FROM memories WHERE vector IS NOT NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
				)
				.all(BATCH, offset) as any[];
			if (rows.length === 0) break;

			const vectors: number[][] = [];
			const ids: string[] = [];
			for (const row of rows) {
				const vec = new Float32Array(row.vector as Buffer);
				vectors.push(Array.from(vec));
				ids.push(row.id);
			}

			const processed = new Set<number>();
			for (let i = 0; i < vectors.length; i++) {
				if (processed.has(i)) continue;
				const cluster = [i];
				for (let j = i + 1; j < vectors.length; j++) {
					if (processed.has(j)) continue;
					const results = this.backend.search(vectors[i], [vectors[j]], 1);
					if (results[0] && results[0].score >= threshold) {
						cluster.push(j);
						processed.add(j);
					}
				}
				for (let k = 1; k < cluster.length; k++) {
					toDelete.add(ids[cluster[k]]);
				}
				processed.add(i);
			}
			offset += BATCH;
		}

		if (toDelete.size === 0) return 0;
		const delStmt = this.conn.prepare("DELETE FROM memories WHERE id = ?");
		const batch = this.conn.transaction(() => {
			for (const id of toDelete) delStmt.run(id);
		});
		batch();
		return toDelete.size;
	}
}
