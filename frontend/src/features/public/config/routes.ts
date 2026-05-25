/** Public marketing routes — no authentication required. */
export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/about",
  "/services",
  "/modules",
  "/ai-health",
  "/telemedicine",
  "/analytics",
  "/patient-experience",
  "/doctor-experience",
  "/hospital-solutions",
  "/security",
  "/contact",
  "/careers",
  "/faq",
  "/insights",
  "/pricing",
  "/partnership",
  "/demo",
] as const;

export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PATHS.some(
    (route) => route !== "/" && (pathname === route || pathname.startsWith(`${route}/`))
  );
}
