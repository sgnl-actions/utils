import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { signSET } from './set.mjs';

describe('signSET', () => {
  let mockContext;
  let consoleWarnSpy;

  beforeEach(() => {
    mockContext = {
      crypto: {
        signJWT: jest.fn().mockResolvedValue('mock.signed.jwt')
      }
    };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should sign a SET payload with correct typ', async () => {
    const payload = {
      aud: 'https://example.com',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/session-revoked': {
          event_timestamp: 1234567890
        }
      }
    };

    const jwt = await signSET(mockContext, payload);

    expect(jwt).toBe('mock.signed.jwt');
    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      payload,
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should filter out reserved iss claim and warn', async () => {
    const payload = {
      iss: 'https://bad-issuer.com',
      aud: 'https://example.com',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/session-revoked': {
          event_timestamp: 1234567890
        }
      }
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: { format: 'email', email: 'user@example.com' },
        events: payload.events
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'signSET: Reserved claims (iss, iat, jti, exp, nbf) are set automatically and will be ignored'
    );
  });

  it('should filter out reserved iat claim and warn', async () => {
    const payload = {
      aud: 'https://example.com',
      iat: 1234567890,
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: payload.sub_id,
        events: {}
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should filter out reserved jti claim and warn', async () => {
    const payload = {
      aud: 'https://example.com',
      jti: 'custom-jti',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: payload.sub_id,
        events: {}
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should filter out reserved exp claim and warn', async () => {
    const payload = {
      aud: 'https://example.com',
      exp: 9999999999,
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: payload.sub_id,
        events: {}
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should filter out reserved nbf claim and warn', async () => {
    const payload = {
      aud: 'https://example.com',
      nbf: 1234567890,
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: payload.sub_id,
        events: {}
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should filter out multiple reserved claims and warn once', async () => {
    const payload = {
      iss: 'https://bad-issuer.com',
      iat: 1234567890,
      jti: 'custom-jti',
      exp: 9999999999,
      nbf: 1234567890,
      aud: 'https://example.com',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      {
        aud: 'https://example.com',
        sub_id: payload.sub_id,
        events: {}
      },
      { typ: 'secevent+jwt' }
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('should preserve custom claims', async () => {
    const payload = {
      aud: 'https://example.com',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {},
      custom_claim: 'custom_value',
      another_claim: { nested: 'object' }
    };

    await signSET(mockContext, payload);

    expect(mockContext.crypto.signJWT).toHaveBeenCalledWith(
      payload,
      { typ: 'secevent+jwt' }
    );
  });

  it('should handle errors from crypto.signJWT', async () => {
    mockContext.crypto.signJWT.mockRejectedValue(new Error('Signing failed'));

    const payload = {
      aud: 'https://example.com',
      sub_id: { format: 'email', email: 'user@example.com' },
      events: {}
    };

    await expect(signSET(mockContext, payload)).rejects.toThrow('Signing failed');
  });
});
