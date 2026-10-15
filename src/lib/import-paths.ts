/** Keep the weekly context through upload, mapping, review and the return trip. */
export function importPaths(modern: boolean, checkin: string | null) {
  const importsBase = modern ? "/new/imports" : "/imports";
  const guided = modern && checkin === "weekly";
  const context = (path: string) =>
    guided ? `${path}${path.includes("?") ? "&" : "?"}checkin=weekly` : path;
  return {
    importsBase,
    importPath: (suffix = "") => context(`${importsBase}${suffix}`),
    transactionsPath: modern ? "/new/transactions" : "/transactions",
    transactionsHref: context(modern ? "/new/transactions" : "/transactions"),
  };
}
