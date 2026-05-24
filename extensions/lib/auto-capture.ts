const NOISE = /^(ok|sure|yeah|yes|no|nope|yep|yup|lol|hmm|um|uh|let's|lets|okay|alright|got it|right|cool|nice|great|good)[\s!.?]*$/i;

export function simpleHash(s: string): string {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(36);
}

export class AutoCapture {
	private counter = 0;

	shouldCapture(text: string): boolean {
		const t = text.trim();
		return t.length >= 20 && !NOISE.test(t);
	}

	makeKey(text: string): string {
		this.counter++;
		const hash = simpleHash(text);
		return `msg:${hash}:${this.counter}`;
	}
}