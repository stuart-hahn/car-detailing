import { useEffect, useState } from "react";
import { BackupPanel } from "./BackupPanel";
import { getOrCreateSettings, type AppSettings } from "../lib/db";

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void getOrCreateSettings().then(setSettings);
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Business profile and backup. Theme controls ship in the next update.
        </p>
      </header>

      {settings && (
        <dl className="space-y-3 rounded-xl border border-slate-800 p-4 text-sm">
          <div>
            <dt className="text-slate-500">Business</dt>
            <dd className="font-medium">{settings.business_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Technician</dt>
            <dd>{settings.owner_name}</dd>
          </div>
          {settings.phone && (
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{settings.phone}</dd>
            </div>
          )}
        </dl>
      )}

      <BackupPanel />
    </section>
  );
}
