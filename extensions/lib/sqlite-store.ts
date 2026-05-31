import { ConnectionManager } from "./connection-manager";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { getTags, computeContentHash } from "./tag-service";
import type { Embedding } from "./embedding";

const DEFAULT_DB_PATH = join(homedir(), ".pi", "memory", "memories.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  vector BLOB,
  tags TEXT,
  category TEXT,
  session_id TEXT,
  project_path TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  access_count INTEGER DEFAULT 1,
  user_tag TEXT,
  project_tag TEXT,
  repo_tag TEXT,
  content_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_project ON memories(project_path);
CREATE INDEX IF NOT EXISTS idx_user_tag ON memories(user_tag);
CREATE INDEX IF NOT EXISTS idx_project_tag ON memories(project_tag);
CREATE INDEX IF NOT EXISTS idx_content_hash ON memories(content_hash);
`;

const MIGRATIONS = [
	"ALTER TABLE memories ADD COLUMN user_tag TEXT",
	"ALTER TABLE memories ADD COLUMN project_tag TEXT",
	"ALTER TABLE memories ADD COLUMN repo_tag TEXT",
	"ALTER TABLE memories ADD COLUMN content_hash TEXT",
];

export interface SearchResult {
	id: string;
	content: string;
	tags: string;
	category: string;
	session_id: string;
	project_path: string;
	score: number;
	created_at: number;
}

export interface StoreDeps {
	embedder: Embedding;
	dbPath?: string;
}

export class SqliteStore {
	private conn: ConnectionManager;
	private embedder: Embedding;

	get connection(): ConnectionManager {
		return this.conn;
	}

	constructor(deps: StoreDeps) {
		const dbPath = deps.dbPath ?? DEFAULT_DB_PATH;
		const dir = dirname(dbPath);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		this.conn = new ConnectionManager({ path: dbPath, create: true });
		this.conn.run("PRAGMA journal_mode = WAL");
		this.conn.run("PRAGMA synchronous = NORMAL");
		this.conn.run("PRAGMA busy_timeout = 5000");
		this.conn.exec(SCHEMA);
		this.runMigrations();
		this.embedder = deps.embedder;
	}

	private runMigrations() {
		for (const sql of MIGRATIONS) {
			try {
				this.conn.exec(sql);
			} catch {
				/* column already exists */
			}
		}
		this.conn.exec(
			"CREATE INDEX IF NOT EXISTS idx_user_tag ON memories(user_tag)",
		);
		this.conn.exec(
			"CREATE INDEX IF NOT EXISTS idx_project_tag ON memories(project_tag)",
		);
		this.conn.exec(
			"CREATE INDEX IF NOT EXISTS idx_content_hash ON memories(content_hash)",
		);
	}

	backfillTags(cwd?: string) {
		const tags = getTags(cwd);
		const rows = this.conn
			.prepare(
				"SELECT id, content FROM memories WHERE user_tag IS NULL OR content_hash IS NULL",
			)
			.all() as any[];
		const updateStmt = this.conn.prepare(
			"UPDATE memories SET user_tag = ?, project_tag = ?, repo_tag = ?, content_hash = ? WHERE id = ?",
		);
		const batch = this.conn.transaction(() => {
			for (const row of rows) {
				updateStmt.run(
					tags.user_tag,
					tags.project_tag,
					tags.repo_tag,
					computeContentHash(row.content),
					row.id,
				);
			}
		});
		batch();
		return rows.length;
	}

	async put(params: {
		id: string;
		content: string;
		tags?: string;
		category?: string;
		session_id?: string;
		project_path?: string;
		user_tag?: string;
		project_tag?: string;
		repo_tag?: string;
	}): Promise<void> {
		const vector = await this.embedder.embed(params.content);
		const vectorBuf = Buffer.from(new Float32Array(vector).buffer);
		const contentHash = computeContentHash(params.content);
		const now = Date.now();
		const existing = this.conn
			.prepare("SELECT access_count FROM memories WHERE id = ?")
			.get(params.id) as { access_count: number } | null;
		const accessCount = existing ? existing.access_count + 1 : 1;
		this.conn
			.prepare(
				`INSERT OR REPLACE INTO memories (id, content, vector, tags, category, session_id, project_path, created_at, updated_at, access_count, user_tag, project_tag, repo_tag, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				params.id,
				params.content,
				vectorBuf,
				params.tags ?? null,
				params.category ?? null,
				params.session_id ?? null,
				params.project_path ?? null,
				existing ? ((existing as any).created_at ?? now) : now,
				now,
				accessCount,
				params.user_tag ?? null,
				params.project_tag ?? null,
				params.repo_tag ?? null,
				contentHash,
			);
	}
	async get(id: string): Promise<SearchResult | null> {
		const row = this.conn
			.prepare(
				"SELECT id, content, tags, category, session_id, project_path, created_at FROM memories WHERE id = ?",
			)
			.get(id) as any;
		return row ? { ...row, score: 1.0 } : null;
	}
	async delete(id: string): Promise<boolean> {
		const result = this.conn
			.prepare("DELETE FROM memories WHERE id = ?")
			.run(id);
		return result.changes > 0;
	}
	async list(options?: {
		limit?: number;
		projectPath?: string;
	}): Promise<SearchResult[]> {
		const limit = options?.limit ?? 20;
		const rows = options?.projectPath
			? this.conn
					.prepare(
						"SELECT id, content, tags, category, session_id, project_path, created_at FROM memories WHERE project_path = ? ORDER BY created_at DESC LIMIT ?",
					)
					.all(options.projectPath, limit)
			: this.conn
					.prepare(
						"SELECT id, content, tags, category, session_id, project_path, created_at FROM memories ORDER BY created_at DESC LIMIT ?",
					)
					.all(limit);
		return (rows as any[]).map((r: any) => ({ ...r, score: 1.0 }));
	}
	async search(params: {
		query: string;
		topK?: number;
		projectPath?: string;
		user_tag?: string;
		project_tag?: string;
		repo_tag?: string;
	}): Promise<SearchResult[]> {
		const topK = params.topK ?? 10;
		let sql =
			"SELECT id, content, vector, tags, category, session_id, project_path, created_at FROM memories WHERE vector IS NOT NULL";
		const conditions: string[] = [];
		const args: any[] = [];
		if (params.projectPath) {
			conditions.push("project_path = ?");
			args.push(params.projectPath);
		}
		if (params.user_tag) {
			conditions.push("user_tag = ?");
			args.push(params.user_tag);
		}
		if (params.project_tag) {
			conditions.push("project_tag = ?");
			args.push(params.project_tag);
		}
		if (params.repo_tag) {
			conditions.push("repo_tag = ?");
			args.push(params.repo_tag);
		}
		if (conditions.length > 0) sql += " AND " + conditions.join(" AND ");
		const rows = this.conn.prepare(sql).all(...args) as any[];
		if (rows.length === 0) return [];
		const queryVec = await this.embedder.embed(params.query);
		const scored: SearchResult[] = rows.map((row: any) => {
			const vec = decodeVector(row.vector);
			return {
				id: row.id,
				content: row.content,
				tags: row.tags ?? "",
				category: row.category ?? "",
				session_id: row.session_id ?? "",
				project_path: row.project_path ?? "",
				score: cosineSimilarity(queryVec, vec),
				created_at: row.created_at,
			};
		});
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
	async listBySession(sessionId: string): Promise<SearchResult[]> {
		const rows = this.conn
			.prepare(
				"SELECT id, content, tags, category, session_id, project_path, created_at FROM memories WHERE session_id = ? ORDER BY created_at DESC",
			)
			.all(sessionId) as any[];
		return rows.map((r: any) => ({ ...r, score: 1.0 }));
	}
	// TODO: close
	close(): void {
		this.conn.close();
	}
}

function decodeVector(blob: Buffer | null | undefined): number[] {
	if (!blob) return [];
	const buf = blob instanceof Buffer ? blob : Buffer.from(blob);
	return Array.from(
		new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4),
	);
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let dot = 0,
		magA = 0,
		magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	const denom = Math.sqrt(magA) * Math.sqrt(magB);
	return denom === 0 ? 0 : dot / denom;
}
