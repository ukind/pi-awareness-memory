import { describe, it, expect } from "bun:test";
import { UserProfile } from "../extensions/lib/user-profile";

describe("UserProfile", () => {
	it("builds profile from facts", () => {
		const profile = new UserProfile();
		profile.addFact("user.os", "Windows 11");
		profile.addFact("pref.editor", "vim");
		const p = profile.build();
		expect(p.os).toBe("Windows 11");
		expect(p.editor).toBe("vim");
	});

	it("updates profile when facts change", () => {
		const profile = new UserProfile();
		profile.addFact("user.os", "Windows 10");
		profile.addFact("user.os", "Windows 11");
		const p = profile.build();
		expect(p.os).toBe("Windows 11");
	});

	it("tracks categories from fact keys", () => {
		const profile = new UserProfile();
		profile.addFact("pref.editor", "vim");
		profile.addFact("pref.lang", "TypeScript");
		profile.addFact("project.name", "pi-memory");
		const p = profile.build();
		expect(p.preferences).toBeDefined();
		expect(p.preferences.editor).toBe("vim");
		expect(p.preferences.lang).toBe("TypeScript");
	});

	it("returns empty profile with no facts", () => {
		const profile = new UserProfile();
		const p = profile.build();
		expect(p.os).toBeUndefined();
		expect(p.preferences).toEqual({});
	});

	it("serializes to JSON", () => {
		const profile = new UserProfile();
		profile.addFact("user.name", "Alice");
		const json = profile.toJSON();
		expect(json).toContain("Alice");
		const parsed = JSON.parse(json);
		expect(parsed.name).toBe("Alice");
	});
});
