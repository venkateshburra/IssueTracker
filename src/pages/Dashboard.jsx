import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
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
  const {
    workspaces,
    activeWorkspace,
    workspaceRole,
    loading: wsLoading,
    switchWorkspace,
    createWorkspace,
  } = useWorkspace();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);
  const [wsError, setWsError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(data?.length ?? 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    checkUnread();
    if (!user) return;
    const channel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        checkUnread
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, checkUnread]);

  async function handleCreateWorkspace() {
    if (!newWsName.trim()) { setWsError("Name is required"); return; }
    setCreating(true);
    setWsError("");
    const { error } = await createWorkspace(newWsName.trim());
    if (error) { setWsError(error); setCreating(false); return; }
    setNewWsName("");
    setShowCreateWs(false);
    setWsDropdownOpen(false);
    setCreating(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function confirmLogout() {
    setShowLogoutConfirm(true);
  }

  const currentNav = NAV_ITEMS.find((n) =>
    n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
  );
  const pageTitle = currentNav?.label ?? "Dashboard";
  const role = workspaceRole || userProfile?.role || "member";
  const displayName = userProfile?.name || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Still loading workspaces — show spinner, never the create screen yet
  if (wsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
          <p className="text-white/60 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // No workspace at all — only show create screen if they truly have none
  // (invited users will already have workspaces loaded by this point)
  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your workspace</h1>
          <p className="text-gray-500 text-sm mb-6">
            A workspace is where your team collaborates. Create one to get started.
          </p>
          {wsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {wsError}
            </div>
          )}
          <input
            type="text"
            placeholder="e.g. Acme Corp, My Project..."
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition mb-4"
          />
          <button
            onClick={handleCreateWorkspace}
            disabled={creating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Workspace"}
          </button>
          <button
            onClick={logout}
            className="mt-3 w-full text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {wsDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setWsDropdownOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:sticky md:top-0 w-64 h-screen flex-shrink-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transition-transform duration-300 z-40 flex flex-col`}
      >
        {/* Workspace switcher */}
        <div className="relative px-3 py-3 border-b border-slate-700">
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-700/60 transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {activeWorkspace?.name || "Select workspace"}
              </p>
              <p className="text-slate-400 text-xs">Workspace</p>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${wsDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {wsDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-2 max-h-48 overflow-y-auto">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => { switchWorkspace(ws); setWsDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left ${
                      activeWorkspace?.id === ws.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-md flex items-center justify-center text-white font-bold text-xs">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ws.name}</p>
                      <p className="text-xs text-gray-400">{ws.myRole}</p>
                    </div>
                    {activeWorkspace?.id === ws.id && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 p-2">
                {showCreateWs ? (
                  <div className="p-1 space-y-2">
                    {wsError && <p className="text-xs text-red-500 px-2">{wsError}</p>}
                    <input
                      type="text"
                      placeholder="Workspace name"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button onClick={handleCreateWorkspace} disabled={creating} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                        {creating ? "..." : "Create"}
                      </button>
                      <button onClick={() => { setShowCreateWs(false); setNewWsName(""); setWsError(""); }} className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded-lg text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateWs(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-semibold transition"
                  >
                    <span className="text-base">+</span> New Workspace
                  </button>
                )}
              </div>
            </div>
          )}
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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
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
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] || ROLE_COLORS.member}`}>
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>
          <button
            onClick={confirmLogout}
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
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{pageTitle}</h2>
                {activeWorkspace && (
                  <p className="text-xs text-gray-400 hidden sm:block">
                    {activeWorkspace.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/notifications")}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
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

              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {avatarLetter}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ user, userProfile, checkUnread }} />
          </div>
        </main>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sign Out?</h3>
                <p className="text-sm text-gray-500">Are you sure you want to log out?</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
