interface ProfileData {
	name?: string;
	os?: string;
	editor?: string;
	preferences: Record<string, string>;
	project: Record<string, string>;
}

export class UserProfile {
	private facts = new Map<string, string>();

	addFact(key: string, value: string): void {
		this.facts.set(key, value);
	}

	build(): ProfileData {
		const profile: ProfileData = { preferences: {}, project: {} };
		for (const [key, value] of this.facts) {
			this.assignToProfile(profile, key, value);
		}
		return profile;
	}

	toJSON(): string {
		return JSON.stringify(this.build(), null, 2);
	}

	private assignToProfile(
		profile: ProfileData,
		key: string,
		value: string,
	): void {
		if (key === "user.os") {
			profile.os = value;
			return;
		}
		if (key === "user.name") {
			profile.name = value;
			return;
		}
		if (key === "user.editor") {
			profile.editor = value;
			return;
		}
		const prefix = key.split(".")[0];
		const field = key.split(".").slice(1).join(".");
		if (prefix === "pref") {
			profile.preferences[field] = value;
			if (field === "editor") {
				profile.editor = value;
			}
			return;
		}
		if (prefix === "project") {
			profile.project[field] = value;
			return;
		}
		profile.preferences[key] = value;
	}
}
