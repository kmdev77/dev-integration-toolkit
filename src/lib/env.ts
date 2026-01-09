export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing ${name}. Set it in PowerShell:\n` + `$env:${name}="YOUR_TOKEN_HERE"`
    );
  }
  return v.trim();
}
