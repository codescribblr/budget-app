"use client";
import { useResourceVersion } from "../use-resource-version";
import { guardedMetadata } from "../record-guard";
import { useBudget } from "../budget-context";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import {
  listTemplates,
  deleteTemplate,
  type CSVImportTemplate,
} from "@/lib/mapping-templates";
import { useAccountPermissions } from "@/hooks/use-account-permissions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
export function SettingsTemplates() {
  const version = useResourceVersion("imports");
  const { data } = useBudget();
  const loaded = useRef(false),
    sequence = useRef(0);
  const { isEditor, isLoading } = useAccountPermissions();
  const [templates, setTemplates] = useState<CSVImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<CSVImportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(!loaded.current);
    setError(false);
    try {
      const next = await listTemplates();
      if (id === sequence.current) {
        loaded.current = true;
        setTemplates(next);
      }
    } catch {
      if (id === sequence.current) setError(true);
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isLoading && isEditor) void load();
    return () => {
      sequence.current++;
    };
  }, [isLoading, isEditor, load, version]);
  async function remove() {
    if (!selected?.id || deleting) return;
    setDeleting(true);
    try {
      await deleteTemplate(
        selected.id,
        guardedMetadata(selected, data!.identity.activeAccountId),
      );
      setTemplates((items) => items.filter((t) => t.id !== selected.id));
      setSelected(null);
      toast.success("Template deleted");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete this template.",
      );
      void load();
    } finally {
      setDeleting(false);
    }
  }
  if (isLoading) return <LoadingSpinner />;
  if (!isEditor)
    return (
      <p className="nl-notice">
        Only editors and owners can manage CSV templates.
      </p>
    );
  if (loading) return <LoadingSpinner />;
  if (error && !loaded.current)
    return (
      <div className="nl-settings-panel" role="alert">
        <p>We couldn’t load your templates.</p>
        <Button onClick={load}>Try again</Button>
      </div>
    );
  return (
    <>
      <div className="nl-settings-toolbar">
        <span>
          {templates.length} saved{" "}
          {templates.length === 1 ? "template" : "templates"}
        </span>
        <Link className="nl-primary" href="/new/imports">
          Import a CSV →
        </Link>
      </div>
      {templates.length ? (
        <section className="nl-settings-panel">
          <div className="nl-template-list">
            {templates.map((template) => (
              <article key={template.id}>
                <FileSpreadsheet size={22} />
                <div>
                  <h2>{template.templateName || "Unnamed template"}</h2>
                  <p>
                    {template.columnCount} columns · Used{" "}
                    {template.usageCount || 0} times
                    {template.lastUsed
                      ? ` · Last used ${new Date(template.lastUsed).toLocaleDateString()}`
                      : " · Not used yet"}
                  </p>
                  <details>
                    <summary>View column mapping</summary>
                    <dl>
                      {[
                        ["Date", template.mapping.dateColumn],
                        ["Amount", template.mapping.amountColumn],
                        ["Description", template.mapping.descriptionColumn],
                        ["Debit", template.mapping.debitColumn],
                        ["Credit", template.mapping.creditColumn],
                        [
                          "Transaction type",
                          template.mapping.transactionTypeColumn,
                        ],
                        ["Status", template.mapping.statusColumn],
                      ].map(([label, column]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>
                            {column === null || column === undefined
                              ? "Not mapped"
                              : `Column ${Number(column) + 1}`}
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt>Amount convention</dt>
                        <dd>
                          {template.mapping.amountSignConvention.replaceAll(
                            "_",
                            " ",
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Headers</dt>
                        <dd>
                          {template.mapping.hasHeaders
                            ? "First row contains headers"
                            : "No headers"}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${template.templateName || "template"}`}
                  onClick={() => setSelected(template)}
                >
                  <Trash2 size={17} />
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="nl-settings-empty">
          <FileSpreadsheet size={32} />
          <h2>Your next import can be easier</h2>
          <p>
            Upload a CSV, match its columns, and save the mapping as a template.
            It will appear here for future imports.
          </p>
          <Link className="nl-secondary" href="/new/imports">
            Start an import
          </Link>
        </section>
      )}
      <p className="nl-footnote">
        To change a mapping, use the column-mapping step when importing a CSV
        and save the updated template.
      </p>
      <AlertDialog
        open={!!selected}
        onOpenChange={(open) => !open && !deleting && setSelected(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected?.templateName || "this template"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved mapping, not your imported transactions.
              Future uploads will need their columns mapped again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Keep template
            </AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={remove}>
              {deleting ? "Deleting…" : "Delete template"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
