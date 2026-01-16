import { jest } from '@jest/globals';
import {
  getClientCredentialsToken,
  getAuthorizationHeader,
  getBaseURL,
  createAuthHeaders
} from './auth.mjs';

// Mock fetch globally
global.fetch = jest.fn();

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientCredentialsToken', () => {
    const validConfig = {
      tokenUrl: 'https://auth.example.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    };

    test('should fetch token with InHeader auth style (default)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fetched-token-123' })
      });

      const token = await getClientCredentialsToken(validConfig);

      expect(token).toBe('fetched-token-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': expect.stringMatching(/^Basic /)
          }),
          body: 'grant_type=client_credentials'
        })
      );
    });

    test('should fetch token with InParams auth style', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fetched-token-456' })
      });

      const token = await getClientCredentialsToken({
        ...validConfig,
        authStyle: 'InParams'
      });

      expect(token).toBe('fetched-token-456');

      const callBody = global.fetch.mock.calls[0][1].body;
      expect(callBody).toContain('client_id=test-client-id');
      expect(callBody).toContain('client_secret=test-client-secret');

      // Should NOT have Authorization header
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    test('should include scope when provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      });

      await getClientCredentialsToken({
        ...validConfig,
        scope: 'https://graph.microsoft.com/.default'
      });

      const callBody = global.fetch.mock.calls[0][1].body;
      expect(callBody).toContain('scope=https%3A%2F%2Fgraph.microsoft.com%2F.default');
    });

    test('should include audience when provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      });

      await getClientCredentialsToken({
        ...validConfig,
        audience: 'https://api.example.com'
      });

      const callBody = global.fetch.mock.calls[0][1].body;
      expect(callBody).toContain('audience=https%3A%2F%2Fapi.example.com');
    });

    test('should throw error when tokenUrl is missing', async () => {
      await expect(getClientCredentialsToken({
        clientId: 'id',
        clientSecret: 'secret'
      })).rejects.toThrow('OAuth2 Client Credentials flow requires tokenUrl, clientId, and clientSecret');
    });

    test('should throw error when clientId is missing', async () => {
      await expect(getClientCredentialsToken({
        tokenUrl: 'https://auth.example.com/token',
        clientSecret: 'secret'
      })).rejects.toThrow('OAuth2 Client Credentials flow requires tokenUrl, clientId, and clientSecret');
    });

    test('should throw error when clientSecret is missing', async () => {
      await expect(getClientCredentialsToken({
        tokenUrl: 'https://auth.example.com/token',
        clientId: 'id'
      })).rejects.toThrow('OAuth2 Client Credentials flow requires tokenUrl, clientId, and clientSecret');
    });

    test('should throw error on failed token request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'invalid_client' })
      });

      await expect(getClientCredentialsToken(validConfig))
        .rejects.toThrow('OAuth2 token request failed: 401 Unauthorized');
    });

    test('should throw error when response has no access_token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: 'Bearer' }) // missing access_token
      });

      await expect(getClientCredentialsToken(validConfig))
        .rejects.toThrow('No access_token in OAuth2 response');
    });
  });

  describe('getAuthorizationHeader', () => {
    test('should return Bearer token from BEARER_AUTH_TOKEN secret', async () => {
      const context = {
        environment: {},
        secrets: { BEARER_AUTH_TOKEN: 'my-bearer-token' }
      };

      const header = await getAuthorizationHeader(context);
      expect(header).toBe('Bearer my-bearer-token');
    });

    test('should not double-prefix Bearer token', async () => {
      const context = {
        environment: {},
        secrets: { BEARER_AUTH_TOKEN: 'Bearer already-prefixed' }
      };

      const header = await getAuthorizationHeader(context);
      expect(header).toBe('Bearer already-prefixed');
    });

    test('should return Basic auth from username and password', async () => {
      const context = {
        environment: {},
        secrets: {
          BASIC_USERNAME: 'myuser',
          BASIC_PASSWORD: 'mypassword'
        }
      };

      const header = await getAuthorizationHeader(context);

      // Decode and verify
      const base64Part = header.replace('Basic ', '');
      const decoded = atob(base64Part);
      expect(decoded).toBe('myuser:mypassword');
    });

    test('should return Bearer token from OAuth2 Authorization Code', async () => {
      const context = {
        environment: {},
        secrets: { OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN: 'oauth2-auth-code-token' }
      };

      const header = await getAuthorizationHeader(context);
      expect(header).toBe('Bearer oauth2-auth-code-token');
    });

    test('should fetch and return Bearer token from OAuth2 Client Credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'client-creds-token' })
      });

      const context = {
        environment: {
          OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL: 'https://auth.example.com/token',
          OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID: 'client-id'
        },
        secrets: {
          OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET: 'client-secret'
        }
      };

      const header = await getAuthorizationHeader(context);
      expect(header).toBe('Bearer client-creds-token');
      expect(global.fetch).toHaveBeenCalled();
    });

    test('should throw error when no auth configured', async () => {
      const context = {
        environment: {},
        secrets: {}
      };

      await expect(getAuthorizationHeader(context))
        .rejects.toThrow('No authentication configured');
    });

    test('should throw error when OAuth2 Client Credentials missing TOKEN_URL', async () => {
      const context = {
        environment: {
          OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID: 'client-id'
        },
        secrets: {
          OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET: 'client-secret'
        }
      };

      await expect(getAuthorizationHeader(context))
        .rejects.toThrow('OAuth2 Client Credentials flow requires TOKEN_URL and CLIENT_ID in env');
    });

    test('should handle undefined env and secrets gracefully', async () => {
      const context = {};

      await expect(getAuthorizationHeader(context))
        .rejects.toThrow('No authentication configured');
    });
  });

  describe('getBaseURL', () => {
    test('should return address from params', () => {
      const params = { address: 'https://api.example.com' };
      const context = { environment: { ADDRESS: 'https://fallback.example.com' } };

      const url = getBaseURL(params, context);
      expect(url).toBe('https://api.example.com');
    });

    test('should fall back to ADDRESS from env', () => {
      const params = {};
      const context = { environment: { ADDRESS: 'https://env.example.com' } };

      const url = getBaseURL(params, context);
      expect(url).toBe('https://env.example.com');
    });

    test('should remove trailing slash', () => {
      const params = { address: 'https://api.example.com/' };
      const context = { environment: {} };

      const url = getBaseURL(params, context);
      expect(url).toBe('https://api.example.com');
    });

    test('should throw error when no URL available', () => {
      const params = {};
      const context = { environment: {} };

      expect(() => getBaseURL(params, context))
        .toThrow('No URL specified. Provide address parameter or ADDRESS environment variable');
    });

    test('should handle null params', () => {
      const context = { environment: { ADDRESS: 'https://env.example.com' } };

      const url = getBaseURL(null, context);
      expect(url).toBe('https://env.example.com');
    });

    test('should handle undefined env', () => {
      const params = { address: 'https://api.example.com' };
      const context = {};

      const url = getBaseURL(params, context);
      expect(url).toBe('https://api.example.com');
    });
  });

  describe('createAuthHeaders', () => {
    test('should return headers object with Bearer auth', async () => {
      const context = {
        environment: {},
        secrets: { BEARER_AUTH_TOKEN: 'test-token' }
      };

      const headers = await createAuthHeaders(context);

      expect(headers).toEqual({
        'Authorization': 'Bearer test-token',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });
    });

    test('should return headers object with Basic auth', async () => {
      const context = {
        environment: {},
        secrets: {
          BASIC_USERNAME: 'user',
          BASIC_PASSWORD: 'pass'
        }
      };

      const headers = await createAuthHeaders(context);

      expect(headers.Authorization).toMatch(/^Basic /);
      expect(headers.Accept).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
    });

    test('should throw error when no auth configured', async () => {
      const context = { environment: {}, secrets: {} };

      await expect(createAuthHeaders(context))
        .rejects.toThrow('No authentication configured');
    });
  });
});
