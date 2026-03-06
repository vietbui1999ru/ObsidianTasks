export class SkillError extends Error {
  readonly skillName: string;
  readonly retryable: boolean;
  override readonly cause?: Error;

  constructor(params: {
    message: string;
    skillName: string;
    retryable?: boolean;
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "SkillError";
    this.skillName = params.skillName;
    this.retryable = params.retryable ?? false;
    this.cause = params.cause;
  }
}
