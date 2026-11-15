import { useState } from "react";
import { Check, Search } from "lucide-react";

/* Permission picker in the MathPortal "Access control" design: module search, bulk buttons,
   one card per module with an action chip per permission and an "All" toggle.
   value: { [module]: ["View", "Add", …] }  ·  onChange(nextValue) */

export const moduleLabel = (m, labels = {}) =>
  labels[m] || String(m).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const countSelected = (value = {}) => Object.values(value).reduce((a, list) => a + (list?.length || 0), 0);

export default function RolePermissions({ modules = [], actions = [], labels = {}, value = {}, onChange }) {
  const [q, setQ] = useState("");
  const total = modules.length * actions.length;
  const n = countSelected(value);
  const ql = q.trim().toLowerCase();
  const list = modules.filter((m) => !ql || `${m} ${moduleLabel(m, labels)}`.toLowerCase().includes(ql));

  const has = (m, a) => (value[m] || []).includes(a);
  const full = (m) => actions.length > 0 && (value[m] || []).length === actions.length;
  const allFull = modules.length > 0 && n === total;

  const toggle = (m, a) => {
    const cur = value[m] || [];
    onChange({ ...value, [m]: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] });
  };
  const toggleRow = (m) => onChange({ ...value, [m]: full(m) ? [] : [...actions] });
  const setAll = (kind) => {
    if (kind === "none") return onChange({});
    const next = {};
    modules.forEach((m) => { next[m] = kind === "all" ? [...actions] : actions.filter((a) => a === "View"); });
    onChange(next);
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a module…" className="a-inp !pl-9 !bg-gray-50" />
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-one bg-red-50">{n} of {total} selected</span>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <button type="button" onClick={() => setAll(allFull ? "none" : "all")} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-one hover:bg-one/90">
            {allFull ? "Deselect all modules" : "Select all modules"}
          </button>
          {actions.includes("View") && (
            <button type="button" onClick={() => setAll("view")} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:border-gray-400">View only</button>
          )}
          <button type="button" onClick={() => setAll("none")} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200">Clear all</button>
        </div>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
          {list.map((m) => {
            const c = (value[m] || []).length;
            return (
              <div key={m} className={`rounded-xl border p-3 min-w-0 ${c ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50/60"}`}>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="font-bold text-sm text-gray-800 min-w-0 break-words">{moduleLabel(m, labels)}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold ${c ? "text-gray-500" : "text-gray-300"}`}>{c}/{actions.length}</span>
                    <button
                      type="button"
                      onClick={() => toggleRow(m)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-md border whitespace-nowrap ${full(m) ? "border-transparent text-white bg-one" : "border-gray-200 text-gray-500 bg-white hover:text-gray-800"}`}
                    >
                      {full(m) ? "✓ All" : "All"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 5) || 1}, minmax(0, 1fr))` }}>
                  {actions.map((a) => {
                    const on = has(m, a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggle(m, a)}
                        aria-pressed={on}
                        className={`h-9 px-1 rounded-lg text-[11px] sm:text-xs font-bold border flex items-center justify-center gap-0.5 transition-colors min-w-0 ${on ? "text-white border-transparent bg-one" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"}`}
                      >
                        {on && <Check size={12} className="shrink-0" />}
                        <span className="truncate">{a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-6 text-center">{modules.length ? "No module matches that search." : "No modules available."}</p>
      )}
    </div>
  );
}
