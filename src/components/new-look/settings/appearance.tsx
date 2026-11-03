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
          System follows your device’s appearance. Your choice saves
          automatically.
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
      </section>
      <details className="nl-settings-panel nl-classic-cards">
        <summary>
          Classic dashboard cards <span>Current budget · classic only</span>
        </summary>
        <DashboardSettingsForm />
      </details>
    </>
  );
}
