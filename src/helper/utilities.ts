export function getEnvString(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (typeof defaultValue !== 'undefined' && !value) {
    throw new Error(`${name} not set`);
  }
  return value || '';
}

export function getEnvBool(name: string, defaultValue = false): boolean {
  const value = process.env[name] || defaultValue;
  if (
    typeof defaultValue !== 'undefined' &&
    typeof defaultValue !== 'boolean' &&
    typeof defaultValue !== 'string'
  ) {
    throw new Error(`${name} not set`);
  }
  return value === 'true' || value === true;
}
