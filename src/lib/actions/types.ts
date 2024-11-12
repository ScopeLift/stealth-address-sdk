export type PreparePayload = {
  to: `0x${string}`;
  account: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
};

export class PrepareError extends Error {
  constructor(message = 'error preparing transaction payload') {
    super(message);
    this.name = 'PrepareError';
    Object.setPrototypeOf(this, PrepareError.prototype);
  }
}
