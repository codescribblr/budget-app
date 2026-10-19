"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnsavedChanges } from "./budget-context";

/** Shared save/discard behavior for the less-frequent budget setup tasks. */
export function SetupDialog({
  title,
  description,
  dirty,
  canEdit,
  saveLabel,
  onSave,
  onClose,
  children,
}: {
  title: string;
  description: string;
  dirty: boolean;
  canEdit: boolean;
  saveLabel: string;
  onSave: () => Promise<void>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  useUnsavedChanges(dirty && !saving);
  function close() {
    if (inFlight.current) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function save() {
    if (inFlight.current || !canEdit) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save. Your edits are still here.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="new-look nl-setup-dialog sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onChange={() => {
            setError("");
            setDiscard(false);
          }}
        >
          <div className="nl-setup-scroll">
            <fieldset
              disabled={saving || !canEdit}
              className="nl-form nl-setup-fields"
            >
              {children}
            </fieldset>
          </div>
          <div className="nl-setup-footer">
            {error && (
              <p role="alert" className="nl-error">
                {error}
              </p>
            )}
            {!canEdit && !saving && (
              <p role="status" className="nl-muted">
                Editing is unavailable. You need edit access and an up-to-date
                budget to save changes.
              </p>
            )}
            {discard ? (
              <div className="nl-discard-prompt" role="alert">
                <p>Discard your unsaved changes?</p>
                <div className="nl-form-actions">
                  <button
                    type="button"
                    className="nl-secondary"
                    onClick={() => setDiscard(false)}
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    className="nl-secondary"
                    onClick={onClose}
                  >
                    Discard changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="nl-form-actions">
                <button
                  type="button"
                  className="nl-secondary"
                  disabled={saving}
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nl-primary"
                  disabled={saving || !canEdit || !dirty}
                >
                  {saving ? "Saving…" : saveLabel}
                </button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
