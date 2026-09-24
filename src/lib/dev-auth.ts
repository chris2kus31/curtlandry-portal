/**
 * Local-only dev auth flag. When enabled the login screen offers a
 * "Local API Login" that mints a real JWT from the Laravel dev endpoint.
 */
export function isDevAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}
