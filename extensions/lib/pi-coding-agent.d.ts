declare module "@earendil-works/pi-coding-agent" {
	export interface ExtensionAPI {
		settings?: Record<string, any>;
		registerCommand(
			name: string,
			config: {
				description: string;
				handler: (
					args: string,
					ctx: ExtensionCommandContext,
				) => void | Promise<void>;
			},
		): void;
		registerTool(tool: any): void;
		on(event: string, handler: (...args: any[]) => void | Promise<void>): void;
		readFile(path: string): Promise<string>;
		writeFile(path: string, content: string): Promise<void>;
		systemPrompt(text: string): void;
		callModel?: any;
		llm: {
			chat(messages: any[]): Promise<{ content: string }>;
		};
		sendUserMessage(text: string, options?: { deliverAs?: string }): void;
	}

	export interface ExtensionCommandContext {
		pi: {
			sendMessage(msg: { display: string; details?: any }): Promise<void>;
		};
		args: string[];
		session: any;
	}

	export function defineTool(config: {
		name: string;
		label: string;
		description: string;
		parameters: any;
		execute: (
			toolCallId: string,
			params: any,
			signal: any,
			onUpdate: any,
			ctx: any,
		) => any;
	}): any;
}
