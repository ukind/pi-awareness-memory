import { VectorStore } from "./vector-store";
import { UserProfile } from "./user-profile";
import { renderHtml } from "./memory-html";
import type { Embedding } from "./embedding";

interface ServerConfig {
	port: number;
	memoryDbPath?: string;
}

function jsonResponse(data: unknown): Response {
	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json" },
	});
}

export class MemoryServer {
	private store: VectorStore;
	private profile: UserProfile;
	private server: ReturnType<typeof Bun.serve> | null = null;
	private port: number;

	constructor(config: ServerConfig, embedder: Embedding) {
		this.port = config.port;
		this.store = new VectorStore(embedder);
		this.profile = new UserProfile();
	}

	async start(): Promise<string> {
		const baseUrl = `http://localhost:${this.port}`;
		this.server = Bun.serve({
			port: this.port,
			fetch: (req) => this.handleRequest(req),
		});
		return baseUrl;
	}

	stop(): void {
		this.server?.stop();
	}

	private async handleRequest(req: Request): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === "/") return htmlResponse();
		if (url.pathname === "/api/memories") return this.handleMemories(url);
		if (url.pathname === "/api/profile")
			return jsonResponse(this.profile.build());
		return new Response("Not found", { status: 404 });
	}

	private async handleMemories(url: URL): Promise<Response> {
		const query = url.searchParams.get("q");
		const results = query
			? await this.store.search(query)
			: await this.store.search("");
		return jsonResponse(results);
	}
}

function htmlResponse(): Response {
	return new Response(renderHtml(), {
		headers: { "Content-Type": "text/html" },
	});
}
