import http from "node:http";
import type { SqliteStore } from "./sqlite-store";
import type { UserProfile } from "./user-profile";
import { renderHtml } from "./memory-html";

interface ServerConfig {
	port: number;
	store: SqliteStore;
	profile: UserProfile;
}

function jsonResponse(res: http.ServerResponse, data: unknown): void {
	const body = JSON.stringify(data);
	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(body);
}

export class MemoryServer {
	private store: SqliteStore;
	private profile: UserProfile;
	private server: http.Server | null = null;
	private port: number;

	constructor(config: ServerConfig) {
		this.port = config.port;
		this.store = config.store;
		this.profile = config.profile;
	}

	async start(): Promise<string> {
		this.server = http.createServer((req, res) => this.handleRequest(req, res));
		return new Promise((resolve, reject) => {
			this.server!.listen(this.port, () => {
				const addr = this.server!.address();
				const actualPort =
					typeof addr === "object" && addr ? addr.port : this.port;
				this.port = actualPort;
				resolve(`http://localhost:${actualPort}`);
			});
			this.server!.on("error", reject);
		});
	}

	stop(): void {
		this.server?.close();
	}

	private async handleRequest(
		req: http.IncomingMessage,
		res: http.ServerResponse,
	): Promise<void> {
		const url = new URL(req.url!, `http://localhost:${this.port}`);
		if (url.pathname === "/") {
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(renderHtml());
			return;
		}
		if (url.pathname === "/api/memories") {
			return this.handleMemories(url, res);
		}
		if (url.pathname === "/api/profile") {
			return jsonResponse(res, this.profile.build());
		}
		res.writeHead(404);
		res.end("Not found");
	}

	private async handleMemories(
		url: URL,
		res: http.ServerResponse,
	): Promise<void> {
		const query = url.searchParams.get("q");
		const results = query
			? await this.store.search({ query })
			: await this.store.list({ limit: 50 });
		jsonResponse(res, results);
	}
}
