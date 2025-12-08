/**
 * SGNL Actions Utilities
 *
 * Shared utilities for SGNL actions including authentication,
 * template resolution, and common helpers.
 */

export {
  getClientCredentialsToken,
  getAuthorizationHeader,
  getBaseURL,
  createAuthHeaders
} from './auth.mjs';

export {
  resolveJSONPathTemplates,
} from './template.mjs';
