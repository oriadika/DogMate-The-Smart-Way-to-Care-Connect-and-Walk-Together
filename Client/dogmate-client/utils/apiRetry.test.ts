import { isTransientApiError, withApiRetry } from './apiRetry';

describe('apiRetry', () => {
  it('detects transient EntityManager errors', () => {
    expect(isTransientApiError(new Error('Could not open JPA EntityManager for transaction'))).toBe(
      true
    );
    expect(isTransientApiError(new Error('validation failed'))).toBe(false);
  });

  it('retries transient failures then succeeds', async () => {
    let calls = 0;
    const result = await withApiRetry(async () => {
      calls += 1;
      if (calls < 2) {
        throw new Error('Could not open JPA EntityManager for transaction');
      }
      return 'ok';
    }, { attempts: 3, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});
