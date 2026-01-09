/**
 * Security Event Token (SET) Utilities
 *
 * Utilities for building and signing Security Event Tokens according to RFC 8417.
 */

/**
 * Sign a Security Event Token (SET).
 *
 * Reserved claims (iss, iat, jti, exp, nbf) are automatically added during signing
 * and will be filtered from your payload if included.
 *
 * @param {Object} context - The action context with crypto API
 * @param {Object} eventPayload - The SET payload with event-specific claims (aud, sub_id, events, etc.)
 * @returns {Promise<string>} Signed JWT string
 *
 * @example
 * const payload = {
 *   aud: 'https://example.com',
 *   sub_id: { format: 'email', email: 'user@example.com' },
 *   events: {
 *     'https://schemas.openid.net/secevent/caep/event-type/session-revoked': {
 *       event_timestamp: Math.floor(Date.now() / 1000)
 *     }
 *   }
 * };
 * const jwt = await signSET(context, payload);
 */
export async function signSET(context, eventPayload) {
  // Filter out reserved claims that are set automatically during signing
  const { iss, iat, jti, exp, nbf, ...cleanPayload } = eventPayload;

  if (iss || iat || jti || exp || nbf) {
    console.warn('signSET: Reserved claims (iss, iat, jti, exp, nbf) are set automatically and will be ignored');
  }

  return await context.crypto.signJWT(cleanPayload, { typ: 'secevent+jwt' });
}
