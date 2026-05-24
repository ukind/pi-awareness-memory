export function extractText(event: any): string {
	const msg = event.message ?? event;
	if (typeof msg === "string") return msg;
	if (msg?.content) {
		if (Array.isArray(msg.content)) {
			return msg.content
				.filter((c: any) => typeof c === "string" || c?.type === "text")
				.map((c: any) => typeof c === "string" ? c : c.text ?? "")
				.join(" ");
		}
		return String(msg.content);
	}
	return "";
}