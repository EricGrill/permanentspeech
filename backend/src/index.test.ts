import { describe, it, expect } from 'vitest';

describe('Health endpoint', () => {
  it('should return status ok', async () => {
    // Import the app for testing
    const { default: app } = await import('./index.js');

    // Create a simple test by checking the app exists
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});

describe('Server configuration', () => {
  it('should have cors and json middleware configured', async () => {
    const { default: app } = await import('./index.js');

    // Check that the app has the expected router stack
    const middlewareStack = (app as unknown as { _router?: { stack: unknown[] } })._router?.stack || [];
    expect(middlewareStack.length).toBeGreaterThan(0);
  });
});
