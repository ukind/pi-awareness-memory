import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MemoryServer } from "../memory-server";

describe("MemoryServer", () => {
	let server: MemoryServer;
	let baseUrl: string;

	beforeAll(async () => {
		server = new MemoryServer({ port: 14748 });
		baseUrl = await server.start();
	});

	afterAll(() => {
		server.stop();
	});

	it("serves HTML at root endpoint", async () => {
		const res = await fetch(baseUrl + "/");
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain("<html");
	});

	it("returns memories as JSON at /api/memories", async () => {
		const res = await fetch(baseUrl + "/api/memories");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data)).toBe(true);
	});

	it("returns profile as JSON at /api/profile", async () => {
		const res = await fetch(baseUrl + "/api/profile");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toBeDefined();
	});

	it("searches memories at /api/memories?q=", async () => {
		const res = await fetch(baseUrl + "/api/memories?q=test");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data)).toBe(true);
	});
});
