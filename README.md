# @sgnl-actions/utils

Shared utilities for SGNL actions.

## Installation

```bash
npm install github:sgnl-actions/utils
# or with a specific tag/branch
npm install github:sgnl-actions/utils#v1.1.0
npm install github:sgnl-actions/utils#main
```

## Usage

```javascript
import { getBaseURL, createAuthHeaders, signSET } from '@sgnl-actions/utils';

export default {
  invoke: async (params, context) => {
    // Get base URL and auth headers (auto-detects auth method)
    const baseUrl = getBaseURL(params, context);
    const headers = await createAuthHeaders(context);

    // Make API call
    const response = await fetch(`${baseUrl}/v1.0/users`, { headers });
    // ...
  }
};
```

## API Reference

### `createHeaders(context)`

Creates full headers object with common headers and Authorization (if configured). Auto-detects auth method.

```javascript
const headers = await createHeaders(context);
// Returns: { Authorization: 'Bearer xxx', Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'SGNL-CAEP-Hub/2.0' }
// Or for Basic: { Authorization: 'Basic xxx', ... }
// Or no auth: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'SGNL-CAEP-Hub/2.0' }
```

**Note:** `createAuthHeaders` is deprecated but still available as an alias for backward compatibility.

### `getAuthorizationHeader(context)`

Returns just the Authorization header value. Auto-detects auth method.

```javascript
const authHeader = await getAuthorizationHeader(context);
// Returns: 'Bearer xxx' or 'Basic xxx' or '' (empty string if no auth configured)
```

### `getBaseURL(params, context)`

Gets the base URL for API calls:

```javascript
const baseUrl = getBaseURL(params, context);
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
| 2 | Basic Auth | - | `BASIC_USERNAME`, `BASIC_PASSWORD` |
| 3 | OAuth2 Authorization Code | - | `OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN` |
| 4 | OAuth2 Client Credentials | `OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL`, `OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID`, `OAUTH2_CLIENT_CREDENTIALS_SCOPE`, `OAUTH2_CLIENT_CREDENTIALS_AUDIENCE`, `OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE` | `OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET` |

## Security Event Tokens (SET)

### `signSET(context, eventPayload)`

Signs a Security Event Token (SET) according to RFC 8417. The signing process automatically adds reserved claims (`iss`, `iat`, `jti`, `exp`, `nbf`) - these should not be included in your payload.

```javascript
import { signSET } from '@sgnl-actions/utils';

const eventPayload = {
  aud: 'https://receiver.example.com',
  sub_id: {
    format: 'email',
    email: 'user@example.com'
  },
  events: {
    'https://schemas.openid.net/secevent/caep/event-type/session-revoked': {
      event_timestamp: Math.floor(Date.now() / 1000),
      reason_admin: 'Security policy violation'
    }
  }
};

const jwt = await signSET(context, eventPayload);
// Returns: Signed JWT string with typ: 'secevent+jwt'
```

**Important:** Do not include these reserved claims in your payload - they are set automatically during signing:
- `iss` (issuer)
- `iat` (issued at)
- `jti` (JWT ID)
- `exp` (expiration)
- `nbf` (not before)

If these claims are accidentally included, they will be filtered out and a warning will be logged.

## License

MIT
