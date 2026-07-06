import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";

const PRIORITY_COLORS = {
  P1: "bg-red-100 text-red-700",
  P2: "bg-yellow-100 text-yellow-700",
  P3: "bg-green-100 text-green-700",
};

export default function DashboardHome() {
  const { user, userProfile, isAdmin, isPM } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin, isWorkspacePM } = useWorkspace();
  const effectiveAdmin = isAdmin || isWorkspaceAdmin;
  const effectivePM = isPM || isWorkspacePM;
  const [stats, setStats] = useState({ total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && activeWorkspace) loadDashboard();
  }, [user, activeWorkspace]);

  async function loadDashboard() {
    setLoading(true);
    if (!activeWorkspace) return;
    try {
      let query = supabase.from("tasks").select("*").eq("workspace_id", activeWorkspace.id);

      if (!effectiveAdmin) {
        if (effectivePM) {
          query = query.or(`visibility_role.eq.all,assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        } else {
          query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }
      }

      const { data } = await query;
      if (!data) return;

      const today = new Date();
      const overdue = data.filter(
        (t) => t.due_date && new Date(t.due_date) < today && t.status !== "Done"
      );

      setStats({
        total: data.length,
        todo: data.filter((t) => t.status === "Todo").length,
        inProgress: data.filter((t) => t.status === "In Progress").length,
        done: data.filter((t) => t.status === "Done").length,
        overdue: overdue.length,
      });

      // Recent 5 tasks
      const recent = [...data]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentTasks(recent);
    } catch (err) {
      console.error("Dashboard error:", err);
    }
    setLoading(false);
  }

  const displayName = userProfile?.name || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statCards = [
    { label: "Total Tasks", value: stats.total, icon: "📋", color: "bg-blue-50 border-blue-200 text-blue-700", valueColor: "text-blue-700" },
    { label: "To Do", value: stats.todo, icon: "⬜", color: "bg-gray-50 border-gray-200 text-gray-700", valueColor: "text-gray-700" },
    { label: "In Progress", value: stats.inProgress, icon: "⚙️", color: "bg-indigo-50 border-indigo-200 text-indigo-700", valueColor: "text-indigo-700" },
    { label: "Completed", value: stats.done, icon: "✅", color: "bg-green-50 border-green-200 text-green-700", valueColor: "text-green-700" },
    { label: "Overdue", value: stats.overdue, icon: "⚠️", color: "bg-red-50 border-red-200 text-red-700", valueColor: "text-red-700" },
  ];

  const quickLinks = [
    { to: "/tasks", label: "Create Task", icon: "➕", desc: "Add a new task to track" },
    { to: "/kanban", label: "Kanban Board", icon: "📋", desc: "Visual board view" },
    { to: "/team", label: "Manage Team", icon: "👥", desc: "Invite and manage members" },
    { to: "/sections", label: "Sections", icon: "📂", desc: "Organize task categories" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-1">
          {greeting}, {displayName} 👋
        </h2>
        <p className="text-blue-100 text-sm">
          Here's your project overview for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
        </p>
        {stats.overdue > 0 && (
          <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold">
            ⚠️ {stats.overdue} task{stats.overdue !== 1 ? "s" : ""} overdue — check them out!
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 ${card.color} flex flex-col items-center text-center`}
          >
            <span className="text-2xl mb-2">{card.icon}</span>
            <span className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</span>
            <span className="text-xs font-semibold mt-1 opacity-75">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition group"
              >
                <span className="text-2xl mb-2">{link.icon}</span>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">{link.label}</span>
                <span className="text-xs text-gray-400 mt-0.5">{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Tasks</h3>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
              View all →
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No tasks yet</p>
              <Link to="/tasks" className="mt-2 inline-block text-sm text-blue-600 font-semibold hover:text-blue-800">
                Create your first task →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";
                return (
                  <Link
                    key={task.id}
                    to="/tasks"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === "Done" ? "bg-green-400" :
                      task.status === "In Progress" ? "bg-blue-400" : "bg-gray-300"
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400">{task.status}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                    {overdue && <span className="text-xs text-red-500">⚠️</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
