"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { budgetRequest } from "./budget-context";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [kind, setKind] = useState("suggestion");
  const [comment, setComment] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending || comment.trim().length < 5) return;
    setSending(true);
    setError("");
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    try {
      await budgetRequest("/api/interface-feedback", {
        id,
        kind,
        comment: comment.trim(),
        page: pathname,
      });
      toast.success("Thank you. Your feedback was saved.");
      setComment("");
      setRequestId(null);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Feedback could not be saved. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!sending) onOpenChange(value);
      }}
    >
      <DialogContent className="new-look">
        <DialogHeader>
          <DialogTitle>Help shape the new look</DialogTitle>
          <DialogDescription>
            What helped, felt confusing, or sent you back to classic? Your
            feedback includes this page and your budget account, without
            attaching balances or transactions.
          </DialogDescription>
        </DialogHeader>
        <form className="nl-form" onSubmit={submit}>
          <label>
            Feedback type
            <select
              aria-label="Feedback type"
              value={kind}
              disabled={sending}
              onChange={(e) => {
                setKind(e.target.value);
                setRequestId(null);
              }}
            >
              <option value="suggestion">Suggestion</option>
              <option value="problem">Something didn’t work</option>
              <option value="missing">A tool I’m missing</option>
              <option value="positive">Something I like</option>
            </select>
          </label>
          <label>
            Your feedback
            <textarea
              rows={5}
              minLength={5}
              maxLength={4000}
              required
              value={comment}
              disabled={sending}
              onChange={(e) => {
                setComment(e.target.value);
                setRequestId(null);
              }}
              placeholder="I was trying to…"
            />
          </label>
          <small>
            Page: {pathname}. Please leave account numbers and other sensitive
            details out of your message.
          </small>
          {error && (
            <p role="alert" className="nl-error">
              {error}
            </p>
          )}
          <div className="nl-form-actions">
            <button
              type="button"
              className="nl-secondary"
              disabled={sending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              className="nl-primary"
              disabled={sending || comment.trim().length < 5}
            >
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
