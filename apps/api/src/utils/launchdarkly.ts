import * as LaunchDarkly from 'launchdarkly-node-server-sdk';
import { JwtPayload } from './auth';

let ldClient: LaunchDarkly.LDClient | null = null;

/**
 * Initialize LaunchDarkly SDK client
 * Should be called once at application startup
 */
export function initializeLaunchDarkly(): LaunchDarkly.LDClient {
  if (ldClient) {
    return ldClient;
  }

  const sdkKey = process.env.LD_SDK_KEY;

  if (!sdkKey) {
    console.warn('⚠️  LD_SDK_KEY not set - LaunchDarkly features will be disabled');
    // Return a no-op client for development/testing
    return LaunchDarkly.init('', {
      offline: true,
    });
  }

  const config: LaunchDarkly.LDOptions = {
    // In development, use streaming mode for real-time updates
    // In production, polling is more efficient
    stream: process.env.NODE_ENV === 'development',
  };

  ldClient = LaunchDarkly.init(sdkKey, config);

  ldClient.on('ready', () => {
    console.log('✅ LaunchDarkly SDK initialized');
  });

  ldClient.on('failed', (error) => {
    console.error('❌ LaunchDarkly SDK failed:', error);
  });

  return ldClient;
}

/**
 * Get the LaunchDarkly client instance
 */
export function getLaunchDarklyClient(): LaunchDarkly.LDClient {
  if (!ldClient) {
    return initializeLaunchDarkly();
  }
  return ldClient;
}

/**
 * Build LaunchDarkly context from JWT payload
 * LaunchDarkly uses "context" (v7+) instead of "user" (v6)
 */
export function buildLDContext(user: JwtPayload): LaunchDarkly.LDContext {
  return {
    kind: 'user',
    key: user.userId,
    email: user.email,
    role: user.role,
    // Add any custom attributes here
  };
}

/**
 * Evaluate a feature flag for a given user context
 * @param flagKey - The feature flag key (e.g., 'product-variants')
 * @param context - LaunchDarkly context built from user
 * @param defaultValue - Default value if flag evaluation fails
 * @returns Promise<boolean> - The flag value
 */
export async function evaluateFlag(
  flagKey: string,
  context: LaunchDarkly.LDContext,
  defaultValue = false
): Promise<boolean> {
  try {
    const client = getLaunchDarklyClient();
    const flagValue = await client.variation(flagKey, context, defaultValue);
    return flagValue as boolean;
  } catch (error) {
    console.error(`Error evaluating flag ${flagKey}:`, error);
    return defaultValue;
  }
}

/**
 * Get all flags for a given context
 * Useful for the /features endpoint
 */
export async function getAllFlags(
  context: LaunchDarkly.LDContext
): Promise<Record<string, boolean>> {
  try {
    const client = getLaunchDarklyClient();
    const flags = await client.allFlagsState(context);
    const result: Record<string, boolean> = {};

    // Convert LD flags state to simple key-value map
    // allValues() returns a Map or Map-like object
    const allValues = flags.allValues();
    
    // Handle both Map and plain object cases
    if (allValues instanceof Map) {
      for (const [key, value] of allValues.entries()) {
        if (typeof value === 'boolean') {
          result[key] = value;
        }
      }
    } else {
      // Plain object case
      for (const [key, value] of Object.entries(allValues)) {
        if (typeof value === 'boolean') {
          result[key] = value;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting all flags:', error);
    return {};
  }
}

/**
 * Gracefully close LaunchDarkly client
 * Should be called on application shutdown
 */
export async function closeLaunchDarkly(): Promise<void> {
  if (ldClient) {
    await ldClient.close();
    ldClient = null;
    console.log('📊 LaunchDarkly client closed');
  }
}

