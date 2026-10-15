"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { budgetRequest } from "@/components/new-look/budget-context";

interface Feedback {
  id: string;
  account_id: number;
  page_path: string;
  kind: string;
  comment: string;
  created_at: string;
}
export default function InterfaceFeedbackPage() {
  return (
    <Suspense fallback={<p>Loading feedback…</p>}>
      <FeedbackInbox />
    </Suspense>
  );
}
function FeedbackInbox() {
  const feedbackId = useSearchParams().get("feedback");
  const [rows, setRows] = useState<Feedback[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRows(null);
    setError("");
    const query = feedbackId
      ? `?feedback=${encodeURIComponent(feedbackId)}`
      : "";
    budgetRequest<Feedback[]>(`/api/admin/interface-feedback${query}`)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [feedbackId]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New look feedback</h1>
        <p className="text-muted-foreground mt-2">
          {feedbackId
            ? "Submission from the interface trial."
            : "Most recent 200 submissions from the interface trial."}
        </p>
        {feedbackId && (
          <Link
            className="inline-block mt-3 text-sm underline"
            href="/admin/interface-feedback"
          >
            View all feedback
          </Link>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {!rows && !error && <p>Loading feedback…</p>}
      {rows?.length === 0 && (
        <p>
          {feedbackId
            ? "This feedback could not be found."
            : "No feedback yet."}
        </p>
      )}
      {rows?.map((row) => (
        <article key={row.id} className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <strong>{row.kind}</strong>
            <span>{row.page_path}</span>
            <span>Account {row.account_id}</span>
            <time>{new Date(row.created_at).toLocaleString()}</time>
          </div>
          <p className="whitespace-pre-wrap mt-3">{row.comment}</p>
        </article>
      ))}
    </div>
  );
}
