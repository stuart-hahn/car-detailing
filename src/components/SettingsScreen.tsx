import { useEffect, useState, type FormEvent } from "react";
import type { AppSettings } from "../lib/db";
import { useSettingsStore } from "../store/settingsStore";
import { BackupPanel } from "./BackupPanel";

const PRODUCT_GROUPS: {
  key: keyof AppSettings["products"];
  label: string;
}[] = [
  { key: "exterior", label: "Exterior" },
  { key: "interior", label: "Interior" },
  { key: "wheels", label: "Wheels" },
  { key: "engine", label: "Engine bay" },
];

type ProfileForm = Pick<
  AppSettings,
  "business_name" | "owner_name" | "phone" | "referral_note" | "helpers"
>;

function linesToProducts(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function productsToLines(items: string[]): string {
  return items.join("\n");
}

export function SettingsScreen() {
  const { settings, loaded, load, patch } = useSettingsStore();
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [productLines, setProductLines] = useState<
    Record<keyof AppSettings["products"], string> | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (!settings) return;
    setProfile({
      business_name: settings.business_name,
      owner_name: settings.owner_name,
      phone: settings.phone,
      referral_note: settings.referral_note ?? "",
      helpers: [...settings.helpers],
    });
    setProductLines({
      exterior: productsToLines(settings.products.exterior),
      interior: productsToLines(settings.products.interior),
      wheels: productsToLines(settings.products.wheels),
      engine: productsToLines(settings.products.engine),
    });
  }, [settings]);

  if (!settings || !profile || !productLines) {
    return <p className="text-slate-400">Loading settings…</p>;
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    const helpers = profile.helpers
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 2);
    await patch({
      business_name: profile.business_name.trim(),
      owner_name: profile.owner_name.trim(),
      phone: profile.phone.trim(),
      referral_note: profile.referral_note?.trim() || undefined,
      helpers,
    });
    setSaving(false);
    setSaved(true);
  }

  async function saveProducts(e: FormEvent) {
    e.preventDefault();
    if (!productLines) return;
    setSaving(true);
    setSaved(false);
    await patch({
      products: {
        exterior: linesToProducts(productLines.exterior),
        interior: linesToProducts(productLines.interior),
        wheels: linesToProducts(productLines.wheels),
        engine: linesToProducts(productLines.engine),
      },
    });
    setSaving(false);
    setSaved(true);
  }

  function setHelper(index: number, value: string) {
    setProfile((prev) => {
      if (!prev) return prev;
      const helpers = [...prev.helpers];
      helpers[index] = value;
      return { ...prev, helpers };
    });
  }

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Business profile, appearance, products, and backup.
        </p>
      </header>

      {saved && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Saved.
        </p>
      )}

      <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-slate-800 p-4">
        <h3 className="font-medium text-slate-200">Business profile</h3>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Business name</span>
          <input
            required
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            value={profile.business_name}
            onChange={(e) =>
              setProfile((p) => p && { ...p, business_name: e.target.value })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Technician / owner</span>
          <input
            required
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            value={profile.owner_name}
            onChange={(e) =>
              setProfile((p) => p && { ...p, owner_name: e.target.value })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            type="tel"
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            value={profile.phone}
            onChange={(e) =>
              setProfile((p) => p && { ...p, phone: e.target.value })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Referral note (optional)</span>
          <input
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            value={profile.referral_note}
            onChange={(e) =>
              setProfile((p) => p && { ...p, referral_note: e.target.value })
            }
          />
        </label>
        <div className="space-y-2">
          <span className="text-sm text-slate-400">Helpers (max 2)</span>
          {[0, 1].map((i) => (
            <input
              key={i}
              className="w-full rounded-lg border border-slate-700 px-3 py-2"
              placeholder={i === 0 ? "Helper name" : "Second helper (optional)"}
              value={profile.helpers[i] ?? ""}
              onChange={(e) => setHelper(i, e.target.value)}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save profile
        </button>
      </form>

      <form onSubmit={saveProducts} className="space-y-4 rounded-xl border border-slate-800 p-4">
        <h3 className="font-medium text-slate-200">Products</h3>
        <p className="text-sm text-slate-400">One product per line — used on care sheets.</p>
        {PRODUCT_GROUPS.map(({ key, label }) => (
          <label key={key} className="block space-y-1">
            <span className="text-sm text-slate-400">{label}</span>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 font-mono text-sm"
              value={productLines[key]}
              onChange={(e) =>
                setProductLines((prev) =>
                  prev ? { ...prev, [key]: e.target.value } : prev,
                )
              }
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save products
        </button>
      </form>

      <section className="space-y-4 rounded-xl border border-slate-800 p-4">
        <h3 className="font-medium text-slate-200">Appearance</h3>
        <fieldset className="space-y-2">
          <legend className="text-sm text-slate-400">Theme (when Field mode is off)</legend>
          {(
            [
              ["system", "System"],
              ["dark", "Dark"],
              ["light", "Light"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                checked={settings.theme === value}
                onChange={() => void patch({ theme: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.field_default_on_launch}
            onChange={(e) =>
              void patch({ field_default_on_launch: e.target.checked })
            }
          />
          <span>
            <span className="font-medium text-slate-200">
              Field (light) on at launch
            </span>
            <span className="mt-0.5 block text-slate-400">
              Starts in outdoor mode. Toggle anytime with ☀ Field in the header.
            </span>
          </span>
        </label>
      </section>

      <BackupPanel onImported={() => void load()} />
    </section>
  );
}
