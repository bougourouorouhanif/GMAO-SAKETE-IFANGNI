import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

describe('JWT auth basics', () => {
  it('signs et vérifie token avec JWT_SECRET', () => {
    const token = jwt.sign({ id: 1, role: 'TECHNICIEN' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe('TECHNICIEN');
  });

  it('rejette token signé avec mauvais secret', () => {
    const token = jwt.sign({ id: 1 }, 'mauvais-secret');
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow();
  });

  it('rejette token expiré', () => {
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow(/expired/);
  });
});
