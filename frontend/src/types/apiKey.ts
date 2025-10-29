/**
 * API Key Management Types
 * Defines the structure for market-specific API keys used for external integrations
 */

export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  id: string;
  tenantId: string;
  marketId: string;
  name: string;           // Descriptive name for identification
  keyHash: string;        // Hashed value (never store plain text)
  lastFourChars: string;  // Last 4 characters for identification
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;       // Optional expiration
  createdBy: string;      // User ID
  revokedBy?: string;     // User ID
}

export interface ApiKeyCreationResponse {
  id: string;
  key: string;            // Full key (shown only once)
  name: string;
  marketId: string;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: Date;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  lastFourChars: string;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}