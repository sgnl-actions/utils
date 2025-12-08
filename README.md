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
import { getBaseURL, createAuthHeaders, resolveJSONPathTemplates } from '@sgnl-actions/utils';

export default {
  invoke: async (params, context) => {
    // Resolve JSONPath templates in params using job context from context.data
    const jobContext = context.data || {};
    const { result: resolvedParams } = resolveJSONPathTemplates(params, jobContext);

    // Get base URL and auth headers (auto-detects auth method)
    const baseUrl = getBaseURL(resolvedParams, context);
    const headers = await createAuthHeaders(context);

    // Make API call with resolved values
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

## Template Resolution

### `resolveJSONPathTemplates(input, jobContext, options)`

Resolves JSONPath templates in input objects/strings using job context from `context.data`.

```javascript
import { resolveJSONPathTemplates } from '@sgnl-actions/utils';

// Basic usage
const jobContext = { user: { email: 'john@example.com', id: '123' } };
const input = {
  login: '{$.user.email}',
  userId: '{$.user.id}',
  timestamp: '{$.sgnl.time.now}',
  requestId: '{$.sgnl.random.uuid}'
};

const { result, errors } = resolveJSONPathTemplates(input, jobContext);
// result = {
//   login: 'john@example.com',
//   userId: '123',
//   timestamp: '2025-12-04T10:30:00Z',
//   requestId: '550e8400-e29b-41d4-a716-446655440000'
// }
```

#### Template Syntax

Templates use [JSONPath](https://www.rfc-editor.org/rfc/rfc9535.html) expressions wrapped in curly braces.

| Template | Description | Example |
|----------|-------------|---------|
| `{$.path.to.value}` | Extract value from job context | `{$.user.email}` → `john@example.com` |
| `{$.array[0]}` | Access array element | `{$.items[0].id}` → `123` |
| `{$.array[*].field}` | Wildcard array access | `{$.items[*].name}` → `["item1","item2"]` |
| `{$.sgnl.time.now}` | Current RFC3339 timestamp | `2025-12-04T10:30:00Z` |
| `{$.sgnl.random.uuid}` | Random UUID | `550e8400-e29b-...` |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `omitNoValueForExactTemplates` | boolean | `false` | If true, omits keys where the value is an exact template that can't be resolved (e.g., `{$.missing}`) |
| `injectSGNLNamespace` | boolean | `true` | If true, injects `sgnl.time.now` and `sgnl.random.uuid` |

## License

MIT
