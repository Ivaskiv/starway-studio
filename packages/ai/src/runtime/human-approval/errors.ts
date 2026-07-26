export class HumanApprovalError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'HumanApprovalError'
  }
}

export class ApprovalValidationError extends HumanApprovalError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ApprovalValidationError'
  }
}

export class ApprovalTimeoutError extends HumanApprovalError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ApprovalTimeoutError'
  }
}

export class ApprovalStateError extends HumanApprovalError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ApprovalStateError'
  }
}
