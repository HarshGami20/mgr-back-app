/**
 * Dev-only user listing / impersonation. Never set ALLOW_DEV_USER_TOOLS in production.
 * Local runs often omit NODE_ENV; treat anything other than production as dev-safe.
 */
export function isDevUserToolsEnabled(): boolean {
  if (process.env.ALLOW_DEV_USER_TOOLS === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}
