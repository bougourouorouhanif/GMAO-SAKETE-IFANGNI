import { describe, it, expect } from 'vitest';
import { authLimiter, registerLimiter, apiLimiter } from '../middleware/rateLimit.js';

describe('Rate limit middleware', () => {
  it('exporte fonctions middleware Express', () => {
    expect(typeof authLimiter).toBe('function');
    expect(typeof registerLimiter).toBe('function');
    expect(typeof apiLimiter).toBe('function');
  });

  it('authLimiter accepte (req,res,next)', () => {
    expect(authLimiter.length).toBeGreaterThanOrEqual(3);
  });
});
