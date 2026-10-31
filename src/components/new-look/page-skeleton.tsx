"use client";
import { usePathname } from "next/navigation";
import { SkeletonLine, HomeSkeleton } from "./home-skeleton";
export function PageSkeleton({
  heading = true,
  variant,
}: {
  heading?: boolean;
  variant?: "list" | "report" | "settings" | "detail";
}) {
  const pathname = usePathname();
  if (pathname === "/new" && heading) return <HomeSkeleton />;
  const route = pathname.split("/")[2] || "budget";
  const kind =
    variant ??
    (route === "reports"
      ? "report"
      : route === "settings"
        ? "settings"
        : /\/[0-9]+$/.test(pathname)
          ? "detail"
          : "list");
  const title: Record<string, string> = {
    budget: "Your envelopes",
    accounts: "Your accounts",
    transactions: "Transactions",
    imports: "Your imports",
    income: "Your income",
    plan: "Your monthly plan",
    goals: "Goals & buffer",
    loans: "Your loans",
    investments: "Investments & assets",
    reports: "Your reports",
    settings: "Settings",
    payday: "Give your money a job",
  };
  return (
    <div
      className={`nl-page-skeleton nl-page-skeleton-${kind}`}
      role="status"
      aria-label={`Loading ${title[route] || "your view"}`}
    >
      {heading && (
        <div className="nl-page-heading">
          <div>
            <SkeletonLine width={128} />
            <h1>{title[route] || "Your budget"}</h1>
            <SkeletonLine width="min(440px, 85vw)" />
          </div>
        </div>
      )}
      {kind !== "settings" && (
        <div className="nl-skeleton-metrics" aria-hidden="true">
          {[0, 1, 2].map((n) => (
            <div className="nl-panel" key={n}>
              <SkeletonLine width="60%" />
              <SkeletonLine width="75%" height={32} />
              <SkeletonLine width="45%" />
            </div>
          ))}
        </div>
      )}
      {kind === "report" && (
        <div className="nl-panel nl-skeleton-chart" aria-hidden="true">
          <SkeletonLine width={180} height={20} />
          <div>
            {[48, 70, 57, 85, 65, 90, 78].map((h, n) => (
              <SkeletonLine key={n} width="10%" height={`${h}%`} />
            ))}
          </div>
        </div>
      )}
      <div className="nl-panel" aria-hidden="true">
        <div className="nl-skeleton-toolbar">
          <SkeletonLine width="45%" height={32} />
          <SkeletonLine width="25%" height={32} />
        </div>
        {Array.from({ length: kind === "settings" ? 3 : 5 }, (_, n) => (
          <div className="nl-skeleton-record" key={n}>
            <div>
              <SkeletonLine width={`${60 + (n % 3) * 12}%`} height={18} />
              <SkeletonLine width="46%" />
            </div>
            <div>
              <SkeletonLine width="80%" height={22} />
              <SkeletonLine width="55%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
