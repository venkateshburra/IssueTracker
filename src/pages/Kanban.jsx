import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import TaskDetail from "../components/TaskDetail";

const COLUMNS = [
  { status: "Todo", icon: "📋", color: "bg-gray-100 border-gray-300", headerColor: "bg-gray-200 text-gray-700", dot: "bg-gray-400" },
  { status: "In Progress", icon: "⚙️", color: "bg-blue-50 border-blue-200", headerColor: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { status: "Done", icon: "✅", color: "bg-green-50 border-green-200", headerColor: "bg-green-100 text-green-700", dot: "bg-green-500" },
];

const PRIORITY_BORDER = {
  P1: "border-l-red-500",
  P2: "border-l-yellow-400",
  P3: "border-l-green-400",
};
const PRIORITY_BADGE = {
  P1: "bg-red-100 text-red-700",
  P2: "bg-yellow-100 text-yellow-700",
  P3: "bg-green-100 text-green-700",
};

export default function Kanban() {
  const { user, isAdmin, isPM } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin, isWorkspacePM } = useWorkspace();
  const effectiveAdmin = isAdmin || isWorkspaceAdmin;
  const effectivePM = isPM || isWorkspacePM;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (user && activeWorkspace) getTasks();
  }, [user, activeWorkspace]);

  async function getTasks() {
    setLoading(true);
    if (!activeWorkspace) return;
    try {
      let query = supabase.from("tasks").select("*").eq("workspace_id", activeWorkspace.id);

      if (effectiveAdmin) {
        query = query.order("created_at", { ascending: false });
      } else if (effectivePM) {
        query = query
          .or(`visibility_role.eq.all,assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .order("created_at", { ascending: false });
      } else {
        query = query
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
    setLoading(false);
  }

  // Check for overdue tasks and create notifications
  useEffect(() => {
    if (!user || !tasks.length) return;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done"
    );
    overdueTasks.forEach(async (task) => {
      // Only notify once per task per day — use upsert-like check
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .like("message", `%overdue%${task.title}%`)
        .gte("created_at", today);
      if (!existing?.length) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          message: `⏰ Task "${task.title}" is overdue!`,
          is_read: false,
        });
      }
    });
  }, [tasks, user]);

  async function updateTaskStatus(taskId, newStatus) {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (!error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  }

  function handleDragStart(e, task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, status) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDragLeave() {
    setDragOverStatus(null);
  }

  function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);
    if (draggedTask && draggedTask.status !== status) {
      updateTaskStatus(draggedTask.id, status);
    }
    setDraggedTask(null);
  }

  function handleDragEnd() {
    setDraggedTask(null);
    setDragOverStatus(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kanban Board</h1>
        <p className="text-gray-500 mt-1">Drag and drop tasks to update their status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          const isOver = dragOverStatus === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-2xl border-2 transition-all duration-200 ${col.color} ${
                isOver ? "border-blue-400 shadow-lg scale-[1.01]" : ""
              } min-h-96`}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl ${col.headerColor}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                <span className="font-bold text-sm">{col.icon} {col.status}</span>
                <span className="ml-auto bg-white/60 text-current font-bold text-xs px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3">
                {colTasks.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed text-gray-400 text-sm ${
                    isOver ? "border-blue-400 bg-blue-50 text-blue-400" : "border-gray-300"
                  }`}>
                    {isOver ? "Drop here" : "No tasks"}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const overdue =
                      task.due_date &&
                      new Date(task.due_date) < new Date() &&
                      task.status !== "Done";
                    const isDragging = draggedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`bg-white rounded-xl shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 border-l-4 select-none ${
                          PRIORITY_BORDER[task.priority] || "border-l-gray-300"
                        } ${isDragging ? "opacity-40 scale-95" : ""} ${overdue ? "ring-1 ring-red-300" : ""}`}
                      >
                        {overdue && (
                          <div className="text-xs text-red-500 font-semibold mb-1.5 animate-pulse">
                            ⚠️ Overdue
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
                            {task.priority}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            {task.label}
                          </span>
                        </div>
                        {task.due_date && (
                          <p className={`text-xs mt-2 ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                            📅 {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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
