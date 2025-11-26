# @sgnl-actions/utils

Shared utilities for SGNL actions.

## Installation

```bash
npm install github:sgnl-actions/utils
# or with a specific tag/branch
npm install github:sgnl-actions/utils#v1.0.0
npm install github:sgnl-actions/utils#main
```

## Usage

```javascript
import { getBaseUrl, createAuthHeaders } from '@sgnl-actions/utils';

export default {
  invoke: async (params, context) => {
    // Get base URL and auth headers (auto-detects auth method)
    const baseUrl = getBaseUrl(params, context);
    const headers = await createAuthHeaders(context);

    // Make API call
    const response = await fetch(`${baseUrl}/v1.0/users`, { headers });
    // ...
  }
};
```

## API Reference

### `createAuthHeaders(context)`

Creates full headers object with Authorization and common headers. Auto-detects auth method.

```javascript
const headers = await createAuthHeaders(context);
// Returns: { Authorization: 'Bearer xxx', Accept: 'application/json', 'Content-Type': 'application/json' }
// Or for Basic: { Authorization: 'Basic xxx', ... }
```

### `getAuthorizationHeader(context)`

Returns just the Authorization header value. Auto-detects auth method.

```javascript
const authHeader = await getAuthorizationHeader(context);
// Returns: 'Bearer xxx' or 'Basic xxx'
```

### `getBaseUrl(params, context)`

Gets the base URL for API calls:

```javascript
const baseUrl = getBaseUrl(params, context);
// Checks: params.address → context.env.ADDRESS
```

### `getClientCredentialsToken(config)`

Fetches OAuth2 token using client credentials flow:

```javascript
const token = await getClientCredentialsToken({
  tokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  scope: 'https://graph.microsoft.com/.default',
  audience: 'optional-audience',
  authStyle: 'InParams' // or 'InHeader' (default)
});
```

## Supported Auth Methods

| Priority | Method | Environment Variables | Secrets |
|----------|--------|----------------------|---------|
| 1 | Bearer Token | - | `BEARER_AUTH_TOKEN` |
| 2 | Basic Auth | `BASIC_USERNAME` | `BASIC_PASSWORD` |
| 3 | OAuth2 Authorization Code | - | `OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN` |
| 4 | OAuth2 Client Credentials | `OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL`, `OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID`, `OAUTH2_CLIENT_CREDENTIALS_SCOPE`, `OAUTH2_CLIENT_CREDENTIALS_AUDIENCE`, `OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE` | `OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET` |

## License

MIT
