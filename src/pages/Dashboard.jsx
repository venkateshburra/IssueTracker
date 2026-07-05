import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useCallback } from "react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
  { path: "/sections", label: "Sections", icon: "📂" },
  { path: "/tasks", label: "Tasks", icon: "✅" },
  { path: "/kanban", label: "Kanban", icon: "📋" },
  { path: "/list", label: "List View", icon: "📝" },
  { path: "/team", label: "Team", icon: "👥" },
  { path: "/notifications", label: "Notifications", icon: "🔔", badge: true },
];

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  pm: "bg-blue-100 text-blue-700",
  member: "bg-green-100 text-green-700",
};

const ROLE_LABELS = {
  admin: "Admin",
  pm: "Project Manager",
  member: "Member",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnreadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(data?.length ?? 0);
    } catch (err) {
      console.error("Notification check error:", err);
    }
  }, [user]);

  useEffect(() => {
    checkUnreadNotifications();

    // Real-time subscription for notification badge
    if (!user) return;
    const channel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => checkUnreadNotifications()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, checkUnreadNotifications]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // Derive page title from current path
  const currentNav = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
  );
  const pageTitle = currentNav?.label ?? "Dashboard";

  const role = userProfile?.role ?? "member";
  const displayName = userProfile?.name || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static w-64 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transition-transform duration-300 z-40 flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-lg shadow">
            📋
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">IssueTracker</h1>
            <p className="text-slate-400 text-xs">Project Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                }`
              }
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <span className="font-medium text-sm flex-1">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{displayName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full bg-red-500/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{pageTitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <button
                onClick={() => navigate("/notifications")}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Avatar */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {avatarLetter}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[role]}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ user, userProfile, checkUnreadNotifications }} />
          </div>
        </main>
      </div>
    </div>
  );
}
