import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
    },
  },
  supabaseFunctionUrl: (n: string) => `https://stub/${n}`,
}));

import { callEdgeFunction } from './_edge';

describe('callEdgeFunction', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  function ok(payload: unknown) {
    return { ok: true, json: () => Promise.resolve(payload) } as unknown as Response;
  }
  function fail(status: number, body: unknown) {
    return {
      ok:     false,
      status,
      json:   () => Promise.resolve(body),
    } as unknown as Response;
  }

  it('attaches the access token in Authorization', async () => {
    fetchMock.mockResolvedValue(ok({ ok: true }));
    await callEdgeFunction('thing', { x: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(init.body).toBe(JSON.stringify({ x: 1 }));
  });

  it('throws when not signed in and allowAnonymous is false', async () => {
    await expect(
      callEdgeFunction('thing', {}, { accessToken: null }),
    ).rejects.toThrow(/Not signed in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('omits Authorization when allowAnonymous is true and no token is present', async () => {
    fetchMock.mockResolvedValue(ok({ ok: true }));
    await callEdgeFunction('thing', {}, { accessToken: null, allowAnonymous: true });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('surfaces the response body error in the thrown message', async () => {
    fetchMock.mockResolvedValue(fail(403, { error: 'forbidden' }));
    await expect(callEdgeFunction('thing', {})).rejects.toThrow(/403.*forbidden/);
  });

  it('handles a non-JSON error body without crashing', async () => {
    fetchMock.mockResolvedValue({
      ok:     false,
      status: 502,
      json:   () => { throw new Error('not json'); },
    } as unknown as Response);
    await expect(callEdgeFunction('thing', {})).rejects.toThrow(/502/);
  });
});
