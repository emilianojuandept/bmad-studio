import { describe, it, expect } from 'vitest'

import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  FileSystemError,
} from './errors.js'

describe('error classes', () => {
  it('AppError has correct properties', () => {
    const err = new AppError('NOT_FOUND', 'test', 404, 'error', { path: '/x' })
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.severity).toBe('error')
    expect(err.message).toBe('test')
    expect(err.details).toEqual({ path: '/x' })
    expect(err).toBeInstanceOf(Error)
  })

  it('toJSON returns API error shape', () => {
    const err = new NotFoundError('file not found', { path: '/x' })
    expect(err.toJSON()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'file not found',
        severity: 'error',
        details: { path: '/x' },
      },
    })
  })

  it('NotFoundError has statusCode 404', () => {
    expect(new NotFoundError('x').statusCode).toBe(404)
  })

  it('ValidationError has statusCode 422', () => {
    expect(new ValidationError('x').statusCode).toBe(422)
  })

  it('ConflictError has statusCode 409', () => {
    expect(new ConflictError('x').statusCode).toBe(409)
  })

  it('FileSystemError has statusCode 500', () => {
    expect(new FileSystemError('x').statusCode).toBe(500)
  })
})
