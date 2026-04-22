import Anthropic from '@anthropic-ai/sdk';

interface GCSAuthConfig {
  workspaceId?: string;
  assetId?: string;
  gcsToken?: string;
}

async function getAnthropicKeyFromGCS(
  config: GCSAuthConfig
): Promise<string | null> {
  const gcsToken =
    config.gcsToken ||
    process.env.GCS_TOKEN ||
    process.env.GCS_BEARER_TOKEN;

  if (!gcsToken) {
    console.log('[GCS Auth] No GCS token provided');
    return null;
  }

  const payload = config.workspaceId
    ? { workspace_id: config.workspaceId }
    : config.assetId
    ? { asset_id: config.assetId }
    : null;

  if (!payload) {
    console.log('[GCS Auth] Must provide either workspaceId or assetId');
    return null;
  }

  try {
    console.log('[GCS Auth] Requesting Anthropic key...');

    const response = await fetch(
      'https://aiplatform.gcs.int.thomsonreuters.com/v1/anthropic/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gcsToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`GCS API returned ${response.status}`);
    }

    const credentials = await response.json();

    if (credentials.anthropic_api_key) {
      console.log('[GCS Auth] ✓ Successfully obtained Anthropic API key');
      return credentials.anthropic_api_key;
    } else {
      console.log('[GCS Auth] ✗ Unexpected response:', credentials);
      return null;
    }
  } catch (error) {
    console.error('[GCS Auth] ✗ Error:', error);
    return null;
  }
}

export async function getTRClaudeClient(): Promise<Anthropic | null> {
  const workspaceId = process.env.GCS_WORKSPACE_ID;
  const assetId = process.env.GCS_ASSET_ID;

  const apiKey = await getAnthropicKeyFromGCS({
    workspaceId,
    assetId
  });

  if (apiKey) {
    return new Anthropic({
      apiKey,
      baseURL: 'https://api.anthropic.com',
    });
  }

  console.log('[GCS Auth] ✗ Failed to get TR Claude client');
  return null;
}
