import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { BoardTitle, Button, Card, ChipRow, DocBar, Select, Skeleton, ToastProvider, useToast } from "../ui";
import { api } from "@/lib/api";
import { applyAppearance, readAppearance, type Appearance } from "@/lib/appearance";
import { AccountSection } from "./AccountSection";
import { SETTINGS } from "./settingsLooks";
import type { Settings } from "@/lib/types";

/** `GET /api/themes` — `name` is the id on disk, `tokens.name` the display name. */
interface ThemeItem {
  name: string;
  tokens: { name: string; colors: Record<string, string> } | null;
}

function ThemeSection() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultTheme, setDefaultTheme] = useState("");
  const [themes, setThemes] = useState<ThemeItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, themeList] = await Promise.all([
        api<Settings>("/api/settings"),
        api<ThemeItem[]>("/api/themes"),
      ]);
      setThemes(themeList.filter((t) => t.tokens !== null));
      setDefaultTheme(settings.defaultTheme);
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // Kept as an effect: load on mount. The settings and the theme list are
    // both server state, so there is nothing to derive and nothing to lift —
    // the flag this trips is `setLoading(false)` in `load`'s `finally`, which
    // is what ends the skeleton.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", json: { defaultTheme } });
      addToast("Default theme saved", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className={SETTINGS.loading}>
          <Skeleton height={26} width="40%" />
          <Skeleton height={26} />
        </div>
      </Card>
    );
  }

  const selected = themes.find((t) => t.name === defaultTheme);

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <h2 className={SETTINGS.sectionTitle}>Theme</h2>
        <p className={SETTINGS.sectionHint}>
          The theme a new post starts on. The three warm-industrial palettes are identical apart from their accent
          colour, so that swatch is the whole difference.
        </p>

        <div className="flex flex-wrap items-end gap-snug">
          <Select
            label="Default theme"
            options={themes.map((t) => ({
              value: t.name,
              label: t.tokens?.name ?? t.name,
            }))}
            value={defaultTheme}
            onValueChange={setDefaultTheme}
            className="min-w-[calc(var(--spacing-unit)*9)]"
          />
          <span
            // The slide theme's own ink, shown as a chip of the film it prints in. The colour is data, so it travels
            // as a variable the class reads.
            className="mb-0 size-[38px] shrink-0 bg-(--swatch) shadow-[0_0_0_1px_var(--color-field-edge)]"
            style={{ "--swatch": selected?.tokens?.colors["primary"] ?? "transparent" } as CSSProperties}
            aria-hidden="true"
          />
          <code className="mb-hair font-galley text-label leading-label text-graphite-soft">
            {selected?.tokens?.colors["primary"] ?? "—"}
          </code>
        </div>

        <div className={SETTINGS.formActions}>
          <Button type="submit" loading={saving} disabled={!defaultTheme}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Light, Dark or System for the app chrome, kept on this device. The slide themes are not affected. */
function AppearanceSection() {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);

  return (
    <Card>
      <h2 className={SETTINGS.sectionTitle}>Appearance</h2>
      <p className={SETTINGS.sectionHint}>
        How the board looks on this device. It does not change the slides: their themes are set above and in the editor.
        System follows your device.
      </p>
      <ChipRow
        kind="filter"
        ariaLabel="Appearance"
        options={APPEARANCES}
        value={appearance}
        onValueChange={(next) => {
          const choice = APPEARANCES.find((o) => o.value === next)?.value;
          if (!choice) return;
          setAppearance(choice);
          applyAppearance(choice);
        }}
      />
    </Card>
  );
}

function SettingsPage() {
  return (
    <>
      <DocBar>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <BoardTitle>Settings</BoardTitle>
          <p className="text-body leading-body font-medium text-graphite-soft">
            The default a new post starts from, and how you sign in.
          </p>
        </div>
      </DocBar>
      <div className="mx-auto flex w-full max-w-narrow flex-col gap-card px-gutter pt-card pb-[40px] phone:px-card">
        <ThemeSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </>
  );
}

export function SettingsIsland() {
  return (
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}
