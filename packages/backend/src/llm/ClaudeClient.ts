import Anthropic from "@anthropic-ai/sdk";
import pRetry from "p-retry";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;
const RETRY_ATTEMPTS = 3;
const RETRY_FACTOR = 2;

export interface ClaudeClientConfig {
  apiKey: string;
  defaultModel?: string;
}

export interface SendMessageParams {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  maxTokens?: number;
}

export interface SendMessageResult {
  content: string;
  usage: { input: number; output: number };
}

export class ClaudeClient {
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const model = params.model ?? this.defaultModel;
    const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;

    const response = await pRetry(
      () =>
        this.client.messages.create({
          model,
          max_tokens: maxTokens,
          system: params.system,
          messages: params.messages,
        }),
      {
        retries: RETRY_ATTEMPTS,
        factor: RETRY_FACTOR,
        onFailedAttempt: (error) => {
          console.warn(
            `Claude API attempt ${error.attemptNumber} failed. ` +
              `${error.retriesLeft} retries left.`,
          );
        },
      },
    );

    const textBlock = response.content.find((block) => block.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";

    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[ClaudeClient] model=${model} tokens: in=${usage.input} out=${usage.output}`,
      );
    }

    return { content, usage };
  }
}
