"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import DashboardSettingsForm from "@/components/settings/DashboardSettingsForm";
export function SettingsAppearance() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <section className="nl-settings-panel">
        <h2>Choose your theme</h2>
        <p>
          Applies to both interfaces on this device. System follows your
          device’s appearance.
        </p>
        <div className="nl-theme-options" role="group" aria-label="Color theme">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "system", label: "System", icon: Monitor },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              disabled={!mounted}
              aria-pressed={mounted && theme === id}
              onClick={() => setTheme(id)}
            >
              <Icon size={24} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="nl-footnote">Your choice is saved automatically.</p>
      </section>
      <details className="nl-settings-panel nl-classic-cards">
        <summary>
          Classic dashboard cards{" "}
          <span>Only applies when you switch to classic</span>
        </summary>
        <p>
          The new home is organized around check-ins. These card visibility
          settings only change the classic dashboard.
        </p>
        <DashboardSettingsForm />
      </details>
    </>
  );
}
