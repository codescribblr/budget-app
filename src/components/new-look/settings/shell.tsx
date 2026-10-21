"use client";
import { useState } from "react";
import Link from "next/link";
import { NativeSelect } from "../native-select";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight, Search } from "lucide-react";
import { settingsGroups, settingsSections, settingsHref } from "./catalog";
import { PageHeading } from "../common";
import "./settings.css";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const section = settingsSections.find(
    (item) => path === settingsHref(item.id),
  );
  if (!section) return <div className="nl-settings">{children}</div>;
  return (
    <div className="nl-settings">
      <Link href="/new/settings" className="nl-settings-back">
        <ArrowLeft size={16} /> All settings
      </Link>
      <PageHeading
        eyebrow={`Settings · ${section.scope}`}
        title={section.title}
        description={section.detail}
      />
      <div className="nl-settings-layout">
        <nav className="nl-settings-nav" aria-label="Settings sections">
          {settingsGroups.map((group) => (
            <div key={group.id}>
              <p>{group.title}</p>
              {settingsSections
                .filter((item) => item.group === group.id)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={settingsHref(item.id)}
                    aria-current={item.id === section.id ? "page" : undefined}
                  >
                    <item.icon size={16} />
                    {item.title}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <label className="nl-settings-mobile">
          Settings section
          <NativeSelect
            value={section.id}
            onChange={(e) => router.push(settingsHref(e.target.value))}
          >
            {settingsGroups.map((group) => (
              <optgroup key={group.id} label={group.title}>
                {settingsSections
                  .filter((item) => item.group === group.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
        </label>
        <div className={`nl-settings-content nl-settings-${section.id}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SettingsOverview() {
  const [search, setSearch] = useState("");
  const words = search.toLowerCase().trim().split(/\s+/);
  const matches = settingsSections.filter((item) =>
    words.every((word) =>
      `${item.title} ${item.description} ${item.keywords}`
        .toLowerCase()
        .includes(word),
    ),
  );
  return (
    <>
      <PageHeading
        eyebrow="Your workspace"
        title="A budget that fits you"
        description="A few thoughtful choices can make your routine easier. Find your tools, preferences, and account settings here."
      />
      <div className="nl-settings-search">
        <Search size={18} />
        <input
          aria-label="Search settings"
          type="search"
          placeholder="Find a setting… try notifications, backup, or sharing"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="sr-only" role="status">
        {matches.length} settings found
      </p>
      {!search && (
        <div className="nl-settings-start">
          <div>
            <p className="nl-eyebrow">A little setup goes a long way</p>
            <h2>Keep your budget as simple as you need.</h2>
            <p>
              Optional tools are yours to choose. Settings for your budget
              follow the account selected in the sidebar.
            </p>
          </div>
          <Link className="nl-secondary" href={settingsHref("features")}>
            Choose your tools <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <div className="nl-settings-groups">
        {settingsGroups.map((group) => {
          const items = matches.filter((item) => item.group === group.id);
          return items.length ? (
            <section key={group.id}>
              <header>
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </header>
              <div className="nl-settings-grid">
                {items.map((item) => (
                  <Link
                    href={settingsHref(item.id)}
                    key={item.id}
                    className="nl-setting-card"
                  >
                    <span className="nl-setting-icon">
                      <item.icon size={20} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
      {!matches.length && (
        <div className="nl-settings-empty">
          <h2>No settings match “{search}”</h2>
          <p>Try a broader term, or see all settings.</p>
          <button className="nl-secondary" onClick={() => setSearch("")}>
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
