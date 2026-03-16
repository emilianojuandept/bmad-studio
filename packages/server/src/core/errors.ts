import type { ErrorCode, Severity } from '@bmad-studio/shared'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly severity: Severity
  readonly details?: unknown

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    severity: Severity = 'error',
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.severity = severity
    this.details = details
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        severity: this.severity,
        ...(this.details !== undefined && { details: this.details }),
      },
    }
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, 404, 'error', details)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, 'error', details)
    this.name = 'ValidationError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, 'error', details)
    this.name = 'ConflictError'
  }
}

export class FileSystemError extends AppError {
  constructor(message: string, details?: unknown) {
    super('FILE_SYSTEM_ERROR', message, 500, 'error', details)
    this.name = 'FileSystemError'
  }
}
