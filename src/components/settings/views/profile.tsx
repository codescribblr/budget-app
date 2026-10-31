"use client";
import { freshFetch as fetch } from "@/lib/view-freshness";

import { usePathname } from "next/navigation";
import { useResourceVersion } from "@/components/new-look/use-resource-version";
import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ProfileSettingsPage() {
  const modern = usePathname().startsWith("/new");
  const resourceVersion = useResourceVersion("settings");
  const dirty = useRef(false);
  const loaded = useRef(false);
  type Profile = {birth_year:number|null; revision:string|null; userId:string};
  const [baseline,setBaseline] = useState<Profile|null>(null);
  const [latest,setLatest] = useState<Profile|null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [resourceVersion]);

  const fetchProfile = async () => {
    try {
      setLoading(!loaded.current);
      setLoadError(false);
      const response = await fetch("/api/user/profile");
      if (!response.ok) throw new Error("Could not load profile");
      {
        const data = await response.json();
        setLatest(data);
        if (!dirty.current) { setBirthYear(data.birth_year);setBaseline(data); }
        loaded.current = true;
      }
    } catch (error) {
      setLoadError(true);
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving || loadError || (modern && !baseline)) return;
    if (
      birthYear !== null &&
      (!Number.isInteger(birthYear) ||
        birthYear < 1900 ||
        birthYear > new Date().getFullYear())
    ) {
      toast.error("Enter a valid birth year between 1900 and this year.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth_year: birthYear, ...(modern ? {expectedRevision:baseline!.revision,expectedUserId:baseline!.userId} : {}) }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "STALE_RECORD") setLatest({...error.latest,userId:baseline!.userId});
        throw new Error(error.error || "Failed to save profile");
      }

      const saved = await response.json();
      setBaseline(saved);setLatest(saved);dirty.current=false;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError && !loaded.current)
    return (
      <div role="alert" className="space-y-4">
        <p>We couldn’t load your profile.</p>
        <Button onClick={fetchProfile}>Try again</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div data-slot="settings-intro">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8 text-primary" />
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal profile information
        </p>
      </div>

      {modern && baseline && latest && baseline.revision !== latest.revision && <div className="nl-notice" role="status">
        <p>Your saved birth year changed to {latest.birth_year ?? "not specified"}. Your entry is retained.</p>
        <button className="nl-secondary" onClick={() => {setBirthYear(latest.birth_year);setBaseline(latest);dirty.current=false;}}>Use latest</button>{" "}
        <button className="nl-secondary" onClick={() => setBaseline(latest)}>Keep my entry · reviewed</button>
      </div>}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            This information is used for financial forecasting and planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="birth-year">Birth Year</Label>
            <Input
              id="birth-year"
              type="number"
              min="1900"
              max={currentYear}
              value={birthYear ?? ""}
              onChange={(e) => {
                dirty.current = true;
                const value = e.target.value;
                setBirthYear(value ? Number(value) : null);
              }}
              placeholder="e.g., 1990"
            />
            <p className="text-sm text-muted-foreground">
              {age !== null
                ? `You turn ${age} in ${currentYear}`
                : "Enter your birth year to enable age-based forecasting"}
            </p>
            <p className="text-xs text-muted-foreground">
              This information is used to calculate forecasts and retirement
              planning. It is stored securely and only accessible to you.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
