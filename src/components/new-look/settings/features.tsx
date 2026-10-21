"use client";
import { PremiumBadge } from "@/components/subscription/PremiumBadge";
import { useState, useRef } from "react";
import Link from "next/link";
import { NativeSelect } from "../native-select";
import { useFeatures, type Feature } from "@/contexts/FeatureContext";
import { useAccountPermissions } from "@/hooks/use-account-permissions";
import { Switch } from "@/components/ui/switch";
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
import { HelpPanel, HelpSection } from "@/components/ui/help-panel";
import { HELP_CONTENT } from "@/lib/help-content";
const levels = [
  { id: "basic", title: "Everyday foundations" },
  { id: "intermediate", title: "A little more structure" },
  { id: "advanced", title: "Plan further ahead" },
  { id: "power", title: "More connected tools" },
];
export function SettingsFeatures() {
  const {
    features,
    loading,
    error,
    hasPremium,
    toggleFeature,
    refreshFeatures,
  } = useFeatures();
  const { isOwner, isLoading } = useAccountPermissions();
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Feature | null>(null);
  const busy = useRef(false);
  async function toggle(feature: Feature, enabled: boolean) {
    if (busy.current || !isOwner) return;
    busy.current = true;
    setPending(feature.key);
    try {
      await toggleFeature(feature.key, enabled);
      toast.success(`${feature.name} ${enabled ? "enabled" : "disabled"}`);
      setConfirm(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this tool",
      );
    } finally {
      busy.current = false;
      setPending(null);
    }
  }
  if (loading || isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <div className="nl-settings-panel" role="alert">
        <p>We couldn’t load your budget tools.</p>
        <Button onClick={refreshFeatures}>Try again</Button>
      </div>
    );
  const visible = features.filter(
    (feature) =>
      filter === "all" ||
      (filter === "enabled" ? feature.enabled : !feature.enabled),
  );
  return (
    <>
      <div className="nl-settings-toolbar">
        <span>
          {features.filter((f) => f.enabled).length} of {features.length} tools
          enabled
        </span>
        <label>
          Show
          <NativeSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All tools</option>
            <option value="enabled">Enabled</option>
            <option value="available">Not enabled</option>
          </NativeSelect>
        </label>
      </div>
      {!isOwner && (
        <p className="nl-notice">
          Only the budget owner can change these settings.
        </p>
      )}
      {levels.map((level) => {
        const items = visible.filter((f) => f.level === level.id);
        return items.length ? (
          <section className="nl-settings-panel" key={level.id}>
            <h2>{level.title}</h2>
            <div className="nl-feature-rows">
              {items.map((feature) => {
                const locked = feature.requiresPremium && !hasPremium;
                const help =
                  HELP_CONTENT[feature.key as keyof typeof HELP_CONTENT];
                return (
                  <div className="nl-feature-row" key={feature.key}>
                    <div>
                      <div className="nl-feature-title">
                        <h3 id={`feature-${feature.key}`}>{feature.name}</h3>
                        {feature.requiresPremium && (
                          <PremiumBadge />
                        )}
                      </div>
                      <p id={`feature-description-${feature.key}`}>
                        {feature.description}
                      </p>
                      {help && (
                        <HelpPanel
                          title={help.title}
                          description={help.description}
                          trigger={
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                            >
                              How this works
                            </Button>
                          }
                        >
                          {help.sections.map((section, index) => (
                            <HelpSection key={index} title={section.title}>
                              {section.content}
                            </HelpSection>
                          ))}
                        </HelpPanel>
                      )}
                      {feature.dependencies.length > 0 && (
                        <p className="nl-feature-dependencies">
                          Requires{" "}
                          {feature.dependencies
                            .map(
                              (key) =>
                                features.find((f) => f.key === key)?.name ||
                                key.replaceAll("_", " "),
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="nl-feature-control">
                      {locked ? (
                        <Link
                          href="/new/settings/subscription"
                          className="nl-secondary"
                        >
                          View plans
                        </Link>
                      ) : (
                        <>
                          <Switch
                            aria-labelledby={`feature-${feature.key}`}
                            aria-describedby={`feature-description-${feature.key}`}
                            checked={feature.enabled}
                            disabled={!isOwner || pending !== null}
                            onCheckedChange={(enabled) =>
                              !enabled && feature.dataLossWarning
                                ? setConfirm(feature)
                                : void toggle(feature, enabled)
                            }
                          />
                          <span>
                            {pending === feature.key
                              ? "Saving…"
                              : feature.enabled
                                ? "On"
                                : "Off"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null;
      })}
      {!visible.length && (
        <div className="nl-settings-panel">
          <p>No tools in this view.</p>
          <button className="nl-secondary" onClick={() => setFilter("all")}>
            Show all tools
          </button>
        </div>
      )}
      <p className="nl-footnote">
        Changes save automatically and apply to this budget in both interfaces.
      </p>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => !open && !pending && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Turning this tool off can affect associated data and stops new
              tracking. Review any dependent tools before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!pending}>
              Keep enabled
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!!pending}
              onClick={() => confirm && toggle(confirm, false)}
            >
              {pending ? "Saving…" : "Turn off tool"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
