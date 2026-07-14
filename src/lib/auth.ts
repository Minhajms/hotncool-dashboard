/** Guard for internal fetch/cron endpoints. Accepts the CRON_SECRET via
 *  Authorization: Bearer <secret>  or  ?key=<secret>. */
export function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("key") === secret) return true;
  return false;
}
