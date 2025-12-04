/**
 * SGNL Actions Utilities
 *
 * Shared utilities for SGNL actions including authentication,
 * template resolution, and common helpers.
 */

export {
  getClientCredentialsToken,
  getAuthorizationHeader,
  getBaseUrl,
  createAuthHeaders
} from './auth.mjs';

export {
  resolveJsonPathTemplates,
} from './template.mjs';
