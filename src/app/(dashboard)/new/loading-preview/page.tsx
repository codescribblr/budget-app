import { notFound } from "next/navigation";
import { LoadingPreview } from "@/components/new-look/loading-preview";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LoadingPreview />;
}
