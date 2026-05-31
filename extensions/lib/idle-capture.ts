export class IdleCapture {
	private pending: string[] = [];
	private timer: ReturnType<typeof setTimeout> | null = null;
	private countSinceCapture = 0;
	private flushCallback: ((texts: string[]) => Promise<void>) | null = null;
	private debounceMs: number;
	private maxMessages: number;

	constructor(debounceMs = 10000, maxMessages = 5) {
		this.debounceMs = debounceMs;
		this.maxMessages = maxMessages;
	}

	onFlush(cb: (texts: string[]) => Promise<void>) {
		this.flushCallback = cb;
	}

	onMessage(text: string) {
		this.pending.push(text);
		this.countSinceCapture++;
		if (this.timer) clearTimeout(this.timer);
		if (this.countSinceCapture >= this.maxMessages) {
			this.flush();
		} else {
			this.timer = setTimeout(() => this.flush(), this.debounceMs);
		}
	}

	private flush() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		if (this.pending.length === 0) return;
		const batch = this.pending;
		this.pending = [];
		this.countSinceCapture = 0;
		if (this.flushCallback) this.flushCallback(batch);
	}

	destroy() {
		if (this.timer) clearTimeout(this.timer);
		this.pending = [];
	}
}
