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
  Todo: "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
};
const LABEL_ICONS = {
  Bug: "🐛",
  Feature: "✨",
  "User Story": "📖",
  Task: "✅",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "P2",
  label: "Task",
  status: "Todo",
  due_date: "",
  section_id: "",
  assigned_to: "",
  visibility_role: "all",
};

export default function Tasks() {
  const { user, userProfile, isAdmin, isPM } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin, isWorkspacePM } = useWorkspace();
  // Use workspace-level role for RBAC
  const effectiveAdmin = isAdmin || isWorkspaceAdmin;
  const effectivePM = isPM || isWorkspacePM;
  const [tasks, setTasks] = useState([]);
  const [sections, setSections] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (user && activeWorkspace) {
      getTasks();
      getSections();
      getMembers();
    }
  }, [user, activeWorkspace]);

  async function getTasks() {
    setLoading(true);
    if (!activeWorkspace) return;
    try {
      let query = supabase.from("tasks").select("*").eq("workspace_id", activeWorkspace.id);

      if (effectiveAdmin) {
        // Admin sees everything in the workspace
        query = query.order("created_at", { ascending: false });
      } else if (effectivePM) {
        // PM sees: all tasks with visibility "all" or "pm", plus any task assigned to or created by them
        query = query
          .or(`visibility_role.eq.all,visibility_role.eq.pm,assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .order("created_at", { ascending: false });
      } else {
        // Member sees only tasks assigned to them or created by them (that aren't admin/pm restricted)
        query = query
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .not("visibility_role", "eq", "admin")
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
    setLoading(false);
  }

  async function getSections() {
    if (!activeWorkspace) return;
    const { data } = await supabase
      .from("sections")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: false });
    if (data) setSections(data);
  }

  async function getMembers() {
    if (!activeWorkspace) return;
    // Get profiles of workspace members
    const { data } = await supabase
      .from("workspace_members")
      .select("role, profiles(id, name, email)")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: true });
    if (data) {
      setMembers(data.map((row) => ({ ...row.profiles, wsRole: row.role })));
    }
  }

  function canEditTask(task) {
    if (!task || !userProfile) return false;
    if (effectiveAdmin) return true;
    if (effectivePM && task.visibility_role === "admin") return false;
    if (task.created_by === user.id) return true;
    return false;
  }

  async function saveTask() {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.section_id) payload.section_id = null;
      if (!payload.assigned_to) payload.assigned_to = null;
      if (!payload.due_date) payload.due_date = null;

      if (editingId) {
        const { error } = await supabase
          .from("tasks")
          .update(payload)
          .eq("id", editingId);
        if (error) { alert("Error updating task: " + error.message); return; }
      } else {
        const shareToken = crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({ ...payload, created_by: user.id, share_token: shareToken, workspace_id: activeWorkspace?.id })
          .select()
          .single();

        if (error) { alert("Error creating task: " + error.message); return; }

        // Notify assigned user
        if (payload.assigned_to && payload.assigned_to !== user.id) {
          await supabase.from("notifications").insert({
            user_id: payload.assigned_to,
            message: `📌 You were assigned to task "${payload.title}"`,
            is_read: false,
          });
        }
      }

      setFormData(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      getTasks();
    } catch (err) {
      console.error("Error saving task:", err);
      alert("Error saving task");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) alert("Error deleting task: " + error.message);
    else getTasks();
  }

  function openEdit(task) {
    setFormData({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "P2",
      label: task.label || "Task",
      status: task.status || "Todo",
      due_date: task.due_date || "",
      section_id: task.section_id || "",
      assigned_to: task.assigned_to || "",
      visibility_role: task.visibility_role || "all",
    });
    setEditingId(task.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchSection = !filterSection || t.section_id === filterSection;
    return matchSearch && matchStatus && matchPriority && matchSection;
  });

  const isOverdue = (task) =>
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} found</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-sm hover:shadow-md text-sm"
          >
            + New Task
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            {editingId ? "✏️ Edit Task" : "➕ Create Task"}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input
                type="text"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — High</option>
                <option value="P3">P3 — Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Label</label>
              <select
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="Bug">🐛 Bug</option>
                <option value="Feature">✨ Feature</option>
                <option value="User Story">📖 User Story</option>
                <option value="Task">✅ Task</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Section</label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              />
            </div>

            {/* Visibility — only admin can restrict */}
            {(isAdmin || isWorkspaceAdmin) && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Visibility</label>
                <select
                  value={formData.visibility_role}
                  onChange={(e) => setFormData({ ...formData, visibility_role: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
                >
                  <option value="all">Everyone</option>
                  <option value="admin">Admin only</option>
                  <option value="pm">PM &amp; Admin</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                placeholder="Describe the task..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm resize-none"
                rows="3"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={saveTask}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold transition text-sm"
            >
              {loading ? "Saving..." : editingId ? "Update Task" : "Create Task"}
            </button>
            <button
              onClick={cancelForm}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="col-span-2 md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
          >
            <option value="">All Status</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
          >
            <option value="">All Priority</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {(searchTerm || filterStatus || filterPriority || filterSection) && (
          <button
            onClick={() => { setSearchTerm(""); setFilterStatus(""); setFilterPriority(""); setFilterSection(""); }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            × Clear all filters
          </button>
        )}
      </div>

      {/* Task list */}
      {loading && !tasks.length ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or create a new task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            const editable = canEditTask(task);
            const sectionName = sections.find((s) => s.id === task.section_id)?.name;
            const assigneeName = members.find((m) => m.id === task.assigned_to)?.name;

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition cursor-pointer group ${
                  overdue ? "border-red-200" : "border-gray-100"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-base">{LABEL_ICONS[task.label] || "✅"}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${STATUS_COLORS[task.status]}`}>
                          {task.status}
                        </span>
                        {sectionName && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600">
                            📂 {sectionName}
                          </span>
                        )}
                        {overdue && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-600 animate-pulse">
                            ⚠️ Overdue
                          </span>
                        )}
                        {task.visibility_role === "admin" && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-600">
                            🔒 Admin only
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-gray-900 truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                        {task.due_date && (
                          <span className={overdue ? "text-red-500 font-medium" : ""}>
                            📅 {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {assigneeName && (
                          <span>👤 {assigneeName}</span>
                        )}
                      </div>
                    </div>

                    {editable && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
