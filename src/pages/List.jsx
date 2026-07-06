import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import TaskDetail from "../components/TaskDetail";

const PRIORITY_COLORS = {
  P1: "bg-red-100 text-red-700",
  P2: "bg-yellow-100 text-yellow-700",
  P3: "bg-green-100 text-green-700",
};
const STATUS_COLORS = {
  Todo: "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
};

export default function List() {
  const { user, isAdmin, isPM } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin, isWorkspacePM } = useWorkspace();
  const effectiveAdmin = isAdmin || isWorkspaceAdmin;
  const effectivePM = isPM || isWorkspacePM;
  const [tasks, setTasks] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("created_at");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (user && activeWorkspace) {
      getTasks();
      getSections();
    }
  }, [user, activeWorkspace, filterStatus, filterPriority]);

  async function getTasks() {
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

      if (filterStatus) query = query.eq("status", filterStatus);
      if (filterPriority) query = query.eq("priority", filterPriority);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
    setLoading(false);
  }

  async function getSections() {
    if (!activeWorkspace) return;
    const { data } = await supabase.from("sections").select("id, name").eq("workspace_id", activeWorkspace.id);
    if (data) setSections(data);
  }

  const priorityOrder = { P1: 1, P2: 2, P3: 3 };
  const statusOrder = { Todo: 1, "In Progress": 2, Done: 3 };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (sortBy === "status") return statusOrder[a.status] - statusOrder[b.status];
    if (sortBy === "due_date") {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  function getSectionName(sectionId) {
    return sections.find((s) => s.id === sectionId)?.name ?? "—";
  }

  function copyShareLink(token) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => alert("Share link copied!"));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">List View</h1>
        <p className="text-gray-500 mt-1">{sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none transition"
            >
              <option value="created_at">Newest</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="due_date">Due Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none transition"
            >
              <option value="">All</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none transition"
            >
              <option value="">All</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterStatus(""); setFilterPriority(""); setSortBy("created_at"); }}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-500 font-medium">No tasks found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl shadow-sm border border-gray-100">
            <table className="w-full bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Priority</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Label</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Section</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTasks.map((task) => {
                  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`hover:bg-blue-50 transition cursor-pointer ${overdue ? "bg-red-50/50" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status]}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                          {task.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {task.section_id ? getSectionName(task.section_id) : "—"}
                      </td>
                      <td className={`px-5 py-4 text-xs font-medium ${overdue ? "text-red-500" : "text-gray-500"}`}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                        {overdue && " ⚠️"}
                      </td>
                      <td className="px-5 py-4">
                        {task.share_token && (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyShareLink(task.share_token); }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                          >
                            Copy link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sortedTasks.map((task) => {
              const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer hover:shadow-md transition ${
                    overdue ? "border-red-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-sm">{task.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status]}`}>
                      {task.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                      {task.label}
                    </span>
                    {overdue && <span className="text-xs text-red-500 font-semibold">⚠️ Overdue</span>}
                  </div>
                  {task.due_date && (
                    <p className={`text-xs mt-2 ${overdue ? "text-red-500" : "text-gray-400"}`}>
                      📅 {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={getTasks}
        />
      )}
    </div>
  );
}
