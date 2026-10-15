"use client";
import { useEffect, useState } from "react";
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
  const [rows, setRows] = useState<Feedback[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    budgetRequest<Feedback[]>("/api/admin/interface-feedback")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New look feedback</h1>
        <p className="text-muted-foreground mt-2">
          Most recent 200 submissions from the interface trial.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      {!rows && !error && <p>Loading feedback…</p>}
      {rows?.length === 0 && <p>No feedback yet.</p>}
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
