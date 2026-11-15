import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  Bell,
  ChevronRight, Search, LogOut, Menu,
} from "lucide-react";
import api from "../api/api";
import { WAITING_EVENT } from "@/components/admin/kit";
import { MAIN_ICONS, SUB_ICONS, SUB_ALIAS } from "./designIcons";

// Our sub-menu labels that differ from the design's icon names.
const OUR_ALIAS = { "Adjustments": "Promo Codes", "Month-End Close": "Payment Package", "Store prices": "Currency", "Courses": "Courses", "Packages": "Packages" };
/** The design's solid sidebar icons (main groups 20px, sub-items 16px). */
function DesignIcon({ set, name }) {
  const m = set === "main" ? MAIN_ICONS[name] : (SUB_ICONS[name] || SUB_ICONS[SUB_ALIAS[name]] || SUB_ICONS[OUR_ALIAS[name]]);
  if (!m) return null;
  const size = set === "main" ? 20 : 16;
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox={m[0]} height={size} width={size} aria-hidden="true" className="shrink-0">
      {m[1].map((d, i) => <path key={i} d={d} fill={m[2] && i === 0 ? "none" : undefined} />)}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Admin shell (MathPortal design): grouped sidebar with search, icon rail on desktop,
   slide-in menu on phones/tablets, header with page title, "waiting" bell and the admin.
   `module` = backend permission module; items the signed-in admin can't View are hidden.
   --------------------------------------------------------------------------- */

const MENU = [
  { id: "home", label: "Home", icon: "home", to: "/admin/Home" },
  { id: "admin", label: "Admin", icon: "admin", children: [
    { label: "Admin", to: "/admin/admin", module: "admins" },
    { label: "Admin Roles", to: "/admin/admin-roles", module: "roles" },
  ] },
  { id: "users", label: "Users", icon: "users", children: [
    { label: "Students", to: "/admin/users/students", module: "students", also: ["/admin/users/student-information", "/admin/users/packages"] },
    { label: "Parents", to: "/admin/users/parents", module: "parents" },
    { label: "Teachers", to: "/admin/users/teachers", module: "teachers" },
  ] },
  { id: "courses", label: "Courses", icon: "courses", children: [
    { label: "Categories", to: "/admin/courses/categories", module: "categories",
      also: ["/admin/courses/courses", "/admin/courses/semester", "/admin/courses/chapters", "/admin/courses/lessons", "/admin/courses/questions", "/admin/courses/quiz", "/admin/courses/exam", "/admin/courses/diagnosticexam"] },
    { label: "Filter", to: "/admin/Filter", module: "courses" },
    { label: "Extra Homework", to: "/admin/extra-homework", module: "extra_homework" },
  ] },
  { id: "live", label: "Live", icon: "live", children: [
    { label: "Sessions", to: "/admin/live/sessions", module: "sessions" },
    { label: "Session Ratings", to: "/admin/live/session-ratings", module: "session_ratings" },
    { label: "Planner", to: "/admin/live/planner", module: "sessions", badge: "plans", also: ["/admin/live/availability-plans"] },
    { label: "Groups", to: "/admin/live/groups", module: "groups" },
    { label: "Cancellations", to: "/admin/live/cancellation", module: "sessions", badge: "cancel" },
    { label: "Teacher", to: "/admin/live/teacher", module: "teachers", badge: "teacher" },
  ] },
  { id: "store", label: "Store", icon: "store", children: [
    { label: "Courses", to: "/admin/store/courses", module: "courses" },
    { label: "Packages", to: "/admin/store/packages", module: "packages", also: ["/admin/packages"] },
  ] },
  { id: "reports", label: "Reports", icon: "reports", children: [
    { label: "Students", to: "/admin/reports/students", module: "reports" },
    { label: "Courses", to: "/admin/reports/courses", module: "reports" },
    { label: "Teachers", to: "/admin/reports/teachers", module: "reports" },
    { label: "Rates", to: "/admin/reports/rates", module: "reports" },
    { label: "Payments", to: "/admin/reports/payments", module: "reports" },
    { label: "Extra H.W", to: "/admin/reports/extra-homework", module: "reports" },
  ] },
  { id: "notifications", label: "Notifications", icon: "notifications", to: "/admin/notifications", module: "notifications" },
  { id: "settings", label: "Settings", icon: "settings", children: [
    { label: "Raw Score", to: "/admin/settings/rawscore", module: "raw_scores" },
    { label: "Exam Code", to: "/admin/settings/examcode", module: "exam_codes" },
    { label: "Section", to: "/admin/settings/section", module: "sections" },
    { label: "Rating Questions", to: "/admin/settings/rating-questions", module: "session_rating_questions" },
    { label: "Grade", to: "/admin/settings/grade", module: "grades", also: ["/admin/courses/grade"] },
    { label: "Store prices", to: "/admin/settings/store-prices", module: "currencies" },
    { label: "Time Slots", to: "/admin/settings/time-slots", module: "availability_plans", also: ["/admin/live/availability-slots"] },
    { label: "Currency", to: "/admin/settings/currency", module: "currencies" },
  ] },
  { id: "payment", label: "Payment", icon: "payment", children: [
    { label: "Receipts & Activation", to: "/admin/payment/paymentrecharge", module: "payments", badge: "receipts",
      also: ["/admin/payment/paymentpackage", "/admin/payment/payment-content"] },
    { label: "Accounts & Channels", to: "/admin/payment/payment-method", module: "payment_methods" },
    { label: "Daily Reconciliation", to: "/admin/payment/reconciliation", module: "payments", badge: "recon" },
    { label: "Unmatched Receipts", to: "/admin/payment/unmatched", module: "payments", badge: "unmatched" },
    { label: "Refunds & Disputes", to: "/admin/payment/refunds", module: "payments", badge: "refunds" },
    { label: "Adjustments", to: "/admin/payment/adjustments", module: "payments", badge: "adjust" },
    { label: "Expenses & Payroll", to: "/admin/payment/expenses", module: "payments" },
    { label: "Teacher Settlements", to: "/admin/payment/teacher-settlements", module: "payments" },
    { label: "Month-End Close", to: "/admin/payment/month-end", module: "payments" },
  ] },
  { id: "marketing", label: "Marketing", icon: "marketing", children: [
    { label: "Popup", to: "/admin/marketing/popup", module: "popups" },
    { label: "Promo Codes", to: "/admin/marketing/promocodes", module: "promo_codes" },
  ] },
];

const BADGE_TEXT = {
  plans: (n) => `${n} study plan${n === 1 ? "" : "s"} to review`,
  cancel: (n) => `${n} student cancel request${n === 1 ? "" : "s"}`,
  teacher: (n) => `${n} teacher request${n === 1 ? "" : "s"}`,
  recharge: (n) => `${n} wallet top-up${n === 1 ? "" : "s"} to check`,
  package: (n) => `${n} package order${n === 1 ? "" : "s"} to check`,
  content: (n) => `${n} content order${n === 1 ? "" : "s"} to check`,
  receipts: (n) => `${n} payment receipt${n === 1 ? "" : "s"} to check`,
  recon: (n) => `${n} reconciliation day${n === 1 ? "" : "s"} not closed`,
  unmatched: (n) => `${n} unmatched receipt${n === 1 ? "" : "s"}`,
  adjust: (n) => `${n} adjustment${n === 1 ? "" : "s"} to approve`,
  refunds: (n) => `${n} refund / dispute ticket${n === 1 ? "" : "s"} open`,
};
const BADGE_ROUTE = {
  plans: "/admin/live/availability-plans", cancel: "/admin/live/cancellation", teacher: "/admin/live/teacher",
  recharge: "/admin/payment/paymentrecharge", package: "/admin/payment/paymentpackage", content: "/admin/payment/payment-content", receipts: "/admin/payment/paymentrecharge",
  recon: "/admin/payment/reconciliation", unmatched: "/admin/payment/unmatched", adjust: "/admin/payment/adjustments", refunds: "/admin/payment/refunds",
};

/** Phones/tablets: the first four of these the admin may open go on the bottom bar; "Menu" opens the full sidebar. */
const MOBILE_PRIORITY = [
  { to: "/admin/Home", short: "Home", icon: "home" },
  { to: "/admin/users/students", short: "Students", icon: "users" },
  { to: "/admin/live/sessions", short: "Sessions", icon: "live" },
  { to: "/admin/payment/paymentrecharge", short: "Receipts", icon: "payment" },
  { to: "/admin/live/planner", short: "Planner", icon: "live" },
  { to: "/admin/users/teachers", short: "Teachers", icon: "users" },
  { to: "/admin/courses/categories", short: "Courses", icon: "courses" },
  { to: "/admin/reports/students", short: "Reports", icon: "reports" },
];

const startsWith = (path, prefix) => path.toLowerCase() === prefix.toLowerCase() || path.toLowerCase().startsWith(`${prefix.toLowerCase()}/`);
const isActive = (path, item) => [item.to, ...(item.also || [])].some((p) => startsWith(path, p));

function readProfile() {
  try { return JSON.parse(localStorage.getItem("admin_profile") || "null"); } catch { return null; }
}
/** Empty permissions = full access (super admin). Actions may be strings or { action }. */
function canView(profile, module) {
  if (!module) return true;
  const perms = profile?.permissions;
  if (!Array.isArray(perms) || perms.length === 0) return true;
  const p = perms.find((x) => x.module === module);
  return !!p && (p.actions || []).some((a) => (typeof a === "string" ? a : a?.action) === "View");
}
const initials = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "A";

/** Counts of work waiting for an admin (refreshed every minute and on page change). */
function useWaiting(pathname) {
  const [counts, setCounts] = useState({});
  const last = useRef(0);
  const load = useCallback((force) => {
    // Six requests per refresh: at most one refresh every 20 s while moving between pages,
    // none while the browser tab is hidden. Pages call refreshWaiting() after answering something.
    if (force !== true && (document.hidden || Date.now() - last.current < 20000)) return;
    last.current = Date.now();
    const get = (url, pick) => api.get(url).then((r) => pick(r?.data?.data)).catch(() => 0);
    Promise.all([
      get("/api/admin/availability-plans?status=pending_admin_review&limit=100", (d) => d?.pagination?.total ?? (d?.items || d?.plans || []).length),
      get("/api/admin/student-cancel-requests?status=pending", (d) => d?.count ?? 0),
      get("/api/admin/teacher-requests?status=pending", (d) => d?.count ?? 0),
      get("/api/admin/payment/recharge-requests?limit=100", (d) => d?.data?.pending?.length ?? 0),
      get("/api/admin/payment/package-buy-requests?limit=100", (d) => d?.data?.pending?.length ?? 0),
      get("/api/admin/payment/content-buy-requests?limit=100", (d) => d?.data?.pending?.length ?? 0),
      get("/api/admin/finance/summary", (d) => d || {}),
    ]).then(([plans, cancel, teacher, recharge, pkg, content, fin]) => setCounts({
      plans, cancel, teacher, recharge, package: pkg, content, receipts: recharge + pkg + content,
      recon: fin?.reconOpen || 0, unmatched: fin?.unmatchedOpen || 0, adjust: fin?.adjustmentsPending || 0, refunds: fin?.refundsOpen || 0,
    }));
  }, []);
  useEffect(() => {
    const force = () => load(true);
    const t = setInterval(load, 60000);
    window.addEventListener(WAITING_EVENT, force);
    return () => { clearInterval(t); window.removeEventListener(WAITING_EVENT, force); };
  }, [load]);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [pathname, load]);
  return counts;
}

function WaitingBell({ counts }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const items = Object.entries(counts).filter(([k, n]) => n > 0 && k !== "receipts"); // "receipts" is the sidebar sum of the three receipt kinds
  const total = items.reduce((a, [, n]) => a + n, 0);
  return (
    <div ref={wrap} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Waiting for you" aria-label="Notifications" aria-expanded={open} className={`nt-bell ${open ? "open" : ""}`}>
        <Bell size={21} />
        {total > 0 && <span className="nt-badge">{total > 99 ? "99+" : total}</span>}
      </button>
      {open && (
        <div className="nt-panel">
          <div className="nt-head"><span className="nt-title">Waiting for you{total > 0 && <span className="nt-count">{total}</span>}</span></div>
          <div className="nt-list">
            {items.length ? items.map(([k, n]) => (
              <button key={k} className="nt-item unread" onClick={() => { setOpen(false); navigate(BADGE_ROUTE[k]); }}>
                <span className="nt-icon brand"><Bell size={16} /></span>
                <span className="nt-body"><span className="nt-item-title">{BADGE_TEXT[k](n)}</span><span className="nt-meta">Open to review</span></span>
              </button>
            )) : <p className="nt-empty">Nothing is waiting. You are all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useMemo(readProfile, []);
  const isMobile = () => window.matchMedia("(max-width: 1023px)").matches;
  const [rail, setRail] = useState(() => {
    try { const v = localStorage.getItem("mp_a_sidebar"); return v ? v === "rail" : window.innerWidth < 1280; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [q, setQ] = useState("");
  const counts = useWaiting(location.pathname);
  const path = location.pathname;

  const menu = useMemo(() => MENU
    .map((g) => (g.children ? { ...g, children: g.children.filter((c) => canView(profile, c.module)) } : g))
    .filter((g) => (g.children ? g.children.length > 0 : canView(profile, g.module))), [profile]);

  const activeGroup = menu.find((g) => g.children?.some((c) => isActive(path, c)))?.id || null;
  useEffect(() => { setOpenGroup(activeGroup); setMobileOpen(false); window.scrollTo?.(0, 0); }, [activeGroup, path]);

  const current = menu.flatMap((g) => (g.children ? g.children : [g])).find((i) => isActive(path, i));
  const title = path.toLowerCase().startsWith("/admin/home") || path === "/admin" || path === "/admin/" ? "Home" : current?.label || "MathPortal";
  useEffect(() => { document.title = `${title} · MathPortal Admin`; }, [title]);

  const toggleSidebar = () => {
    if (isMobile()) { setMobileOpen((o) => !o); return; }
    setRail((r) => { try { localStorage.setItem("mp_a_sidebar", r ? "open" : "rail"); } catch { /* blocked */ } return !r; });
  };
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_profile");
    navigate("/");
  };

  const ql = q.trim().toLowerCase();
  const match = (label) => !ql || label.toLowerCase().includes(ql);
  const badge = (key) => (key && counts[key] > 0 ? <span className="nav-badge">{counts[key] > 99 ? "99+" : counts[key]}</span> : null);
  const groupCount = (g) => (g.children || []).reduce((a, c) => a + (c.badge ? counts[c.badge] || 0 : 0), 0);
  const showRail = rail && !mobileOpen;

  // Bottom bar: first four allowed items from MOBILE_PRIORITY (Home is always allowed).
  const allItems = menu.flatMap((g) => (g.children ? g.children : [g]));
  const mobileItems = MOBILE_PRIORITY
    .map((m) => ({ ...m, item: allItems.find((i) => i.to === m.to) }))
    .filter((m) => m.item)
    .slice(0, 4);
  const onHome = path === "/admin" || path === "/admin/" || startsWith(path, "/admin/Home");
  const mobileActive = (m) => (m.to === "/admin/Home" ? onHome : isActive(path, m.item));
  const inBar = mobileItems.some(mobileActive);
  const barBadges = new Set(mobileItems.map((m) => m.item.badge).filter(Boolean));
  const menuWaiting = Object.entries(counts).filter(([k, n]) => n > 0 && k !== "receipts" && !barBadges.has(k)
    && !(barBadges.has("receipts") && ["recharge", "package", "content"].includes(k))).reduce((a, [, n]) => a + n, 0);

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ background: "#f8fafc" }}>
      <aside
        id="sidebar"
        className={`a-side bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 ease-in-out z-50 max-lg:z-[60] max-lg:shadow-2xl fixed inset-y-0 left-0 lg:relative ${showRail ? "rail w-64 lg:w-[4.75rem]" : "w-64"} ${mobileOpen ? "" : "max-lg:-ml-64"}`}
      >
        <div className="a-side-head flex items-center gap-3 px-5 h-16 border-b border-gray-100 shrink-0 cursor-pointer hover:bg-gray-50/60 transition-colors" onClick={() => navigate("/admin/Home")} title="Home">
          <img alt="MathPortal" className="w-9 h-9 rounded-lg shadow-sm shrink-0" src="/favicon.svg" />
          <div className="a-brand-txt leading-tight min-w-0">
            <div className="font-bold text-lg text-gray-900 tracking-tight whitespace-nowrap">Math<span className="text-one">Portal</span></div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Admin panel</div>
          </div>
        </div>
        <div className="a-search px-3 pt-3 pb-1 shrink-0">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-3 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-one/20 focus:border-one transition-all" />
          </div>
        </div>
        <ul id="menu" className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pt-1 pb-3">
          <li className="a-menu-h">Menu</li>
          {menu.map((g) => {
            if (!g.children) {
              if (!match(g.label)) return null;
              const act = isActive(path, g) || (g.id === "home" && (path === "/admin" || path === "/admin/"));
              return (
                <li key={g.id} className="list-none">
                  <NavLink to={g.to} className={`a-nav ${act ? "active" : ""}`} title={g.label}>
                    <span className="shrink-0"><DesignIcon set="main" name={g.icon} /></span><span>{g.label}</span>
                  </NavLink>
                </li>
              );
            }
            const kids = g.children.filter((c) => match(c.label) || match(g.label));
            if (!kids.length) return null;
            const open = openGroup === g.id || !!ql;
            const hasActive = g.children.some((c) => isActive(path, c));
            const gc = groupCount(g);
            return (
              <li key={g.id} className="list-none">
                <button
                  onClick={() => { if (showRail) { toggleSidebar(); setOpenGroup(g.id); return; } setOpenGroup(open && !ql ? null : g.id); }}
                  className={`a-nav ${hasActive ? "active" : ""}`}
                  title={gc ? `${g.label} · ${gc} waiting` : g.label}
                >
                  <span className="shrink-0"><DesignIcon set="main" name={g.icon} /></span>
                  <span className="flex-1 text-left">{g.label}</span>
                  {gc > 0 && <span className="nav-badge">{gc > 99 ? "99+" : gc}</span>}
                  <span className="a-chev"><ChevronRight size={16} className={`transition-transform duration-300 ${open ? "rotate-90" : "opacity-40"}`} /></span>
                </button>
                {open && (
                  <ul className="mt-1 ml-6 border-l border-gray-100 space-y-1 py-1 animate-in">
                    {kids.map((c) => (
                      <li key={c.to}>
                        <NavLink to={c.to} className={`a-sub ml-2 ${isActive(path, c) ? "active" : ""}`} title={c.badge && counts[c.badge] ? BADGE_TEXT[c.badge](counts[c.badge]) : c.label}>
                          <DesignIcon set="sub" name={c.label} /><span className="whitespace-nowrap">{c.label}</span>{badge(c.badge)}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <div className="p-3 border-t border-gray-100 mt-auto shrink-0">
          <button onClick={signOut} className="a-signout group flex items-center p-3 w-full rounded-xl transition-all duration-200 gap-x-4 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Sign out">
            <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-1" />
            <span className="a-lbl font-semibold text-[14px]">Sign Out</span>
          </button>
        </div>
      </aside>
      <div id="sb-backdrop" className={mobileOpen ? "on" : ""} onClick={() => setMobileOpen(false)}></div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="flex items-center justify-between bg-white border-b border-gray-100 shrink-0 h-16 pl-3 sm:pl-5 pr-4 sm:pr-6 lg:pr-8 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={toggleSidebar} className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 shrink-0" title={rail ? "Show sidebar" : "Hide sidebar"} aria-label="Toggle sidebar">
              <Menu size={20} />
            </button>
            <img alt="MathPortal" className="w-8 h-8 rounded-lg shadow-sm shrink-0 lg:hidden" src="/favicon.svg" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">{title}</h2>
              <p className="text-xs text-gray-400 hidden sm:block">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <WaitingBell counts={counts} />
            <NavLink to="/admin/admin" className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-gray-50 transition-colors shrink-0" title="Admins">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-900">{profile?.name || "Admin"}</div>
                <div className="text-[10px] text-gray-500">{profile?.role ? `${profile.role} • Admins` : "Administrator"}</div>
              </div>
              <div className="mp-ava">{initials(profile?.name)}</div>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:py-8 custom-scrollbar" style={{ background: "#f8fafc" }}>
          <div id="page" className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom bar (phones / tablets): main pages + "Menu" for everything else */}
      <nav className="a-mbar lg:hidden" aria-label="Admin sections">
        {mobileItems.map((m) => {
          const n = m.item.badge ? counts[m.item.badge] || 0 : 0;
          return (
            <NavLink key={m.to} to={m.to} className={`a-mnav ${mobileActive(m) ? "on" : ""}`} aria-current={mobileActive(m) ? "page" : undefined}>
              <DesignIcon set="main" name={m.icon} />
              <span>{m.short}</span>
              {n > 0 && <span className="a-mdot">{n > 99 ? "99+" : n}</span>}
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setMobileOpen(true)} className={`a-mnav ${!inBar || mobileOpen ? "on" : ""}`} aria-expanded={mobileOpen} aria-controls="sidebar">
          <Menu size={20} />
          <span>Menu</span>
          {menuWaiting > 0 && <span className="a-mdot">{menuWaiting > 99 ? "99+" : menuWaiting}</span>}
        </button>
      </nav>
      <Toaster position="top-center" />
    </div>
  );
};

export default AppLayout;
