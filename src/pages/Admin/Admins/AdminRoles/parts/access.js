/* What a role's permissions reach, for the admins and roles lists.
   Permissions arrive as [{ module, actions: ["View", "Add", …] }] — sometimes as a JSON string. */

export const ALL_ACTIONS = ["View", "Add", "Edit", "Delete", "Status"];

export function parsePerms(raw) {
  let v = raw;
  try {
    while (typeof v === "string") v = JSON.parse(v);
  } catch {
    return [];
  }
  if (!Array.isArray(v)) return [];
  return v
    .filter((p) => p && p.module)
    .map((p) => ({
      module: p.module,
      actions: (p.actions || []).map((a) => (typeof a === "string" ? a : a?.action)).filter(Boolean),
    }));
}

export const countPerms = (perms) => perms.reduce((n, p) => n + p.actions.length, 0);

export const labelOf = (m, labels = {}) =>
  labels[m] || String(m).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** One entry per module that has any action: { module, label, tag: "Full" | "View" | "Partial" } */
export function accessSummary(perms, actions = ALL_ACTIONS, labels = {}) {
  return perms
    .filter((p) => p.actions.length)
    .map((p) => {
      const full = actions.every((a) => p.actions.includes(a));
      const viewOnly = p.actions.length === 1 && p.actions[0] === "View";
      return { module: p.module, label: labelOf(p.module, labels), tag: full ? "Full" : viewOnly ? "View" : "Partial" };
    });
}

export const ACCESS_TAG = { Full: "bg-green-50 text-green-700", Partial: "bg-amber-50 text-amber-700", View: "bg-blue-50 text-blue-700" };
