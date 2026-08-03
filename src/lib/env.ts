export function getEnv(key: string, fallback?: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)?.[key] ?? process.env?.[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getEnvOptional(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)?.[key] ?? process.env?.[key];
  return value === '' ? undefined : value;
}
