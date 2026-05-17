import { useUiStore, type AppTab } from "../../store/uiStore";

const TABS: { id: AppTab; label: string }[] = [
  { id: "active", label: "Active Job" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

export function BottomNav() {
  const { appTab, setAppTab } = useUiStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAppTab(tab.id)}
            className={`min-h-14 flex-1 px-2 py-3 text-center text-sm font-medium ${
              appTab === tab.id
                ? "text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
            aria-current={appTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
