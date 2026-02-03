/**
 * Container utility functions
 */

/**
 * Parse environment variables from container format to object
 * @param envArray - Array of env vars in "KEY=value" format
 * @returns Object with parsed key-value pairs
 */
export function parseEnvVars(envArray: string[]): Record<string, string> {
  const envVars: Record<string, string> = {};
  for (const envPair of envArray) {
    const [key, ...valueParts] = envPair.split('=');
    if (key) {
      envVars[key] = valueParts.join('=');
    }
  }
  return envVars;
}
