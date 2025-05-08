import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture constructor options for Pool
const mockPoolConstructor = vi.fn();

vi.mock('pg', () => ({
  Pool: class {
    constructor(opts) {
      mockPoolConstructor(opts);
    }
    async connect() {
      return { query: () => {}, release: () => {} };
    }
    async end() {}
  }
}));

describe('Pool Configuration', () => {
  beforeEach(() => {
    mockPoolConstructor.mockClear();
    delete process.env.PG_POOL_SIZE;
    delete process.env.PG_CONNECTION_STRING;
    vi.resetModules();
  });

  it('should initialize pg Pool with connectionString and max from env vars', async () => {
    process.env.PG_CONNECTION_STRING = 'postgres://user:pass@host:5432/db';
    process.env.PG_POOL_SIZE = '5';
    const { pool } = await import('../../src/lib/main.js');
    expect(mockPoolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@host:5432/db',
      max: 5
    });
    const client = await pool.connect();
    expect(client).toHaveProperty('query');
    expect(client).toHaveProperty('release');
  });

  it('uses default pool size when PG_POOL_SIZE is not set', async () => {
    process.env.PG_CONNECTION_STRING = 'postgres://user2:pass2@host2:5432/db2';
    const { pool } = await import('../../src/lib/main.js');
    expect(mockPoolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgres://user2:pass2@host2:5432/db2',
      max: 10
    });
    const client = await pool.connect();
    expect(client).toHaveProperty('query');
    expect(client).toHaveProperty('release');
  });
});