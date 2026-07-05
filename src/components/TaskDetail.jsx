import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["Todo", "In Progress", "Done"];
const PRIORITY_COLORS = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-yellow-100 text-yellow-700 border-yellow-200",
  P3: "bg-green-100 text-green-700 border-green-200",
};
const LABEL_COLORS = {
  Bug: "bg-red-50 text-red-600",
  Feature: "bg-blue-50 text-blue-600",
  "User Story": "bg-purple-50 text-purple-600",
  Task: "bg-gray-50 text-gray-600",
};

export default function TaskDetail({ taskId, onClose, onTaskUpdated }) {
  const { user, userProfile, isAdmin, isPM } = useAuth();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [taskId]);

  async function fetchTask() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    if (!error && data) setTask(data);
    setLoading(false);
  }

  async function fetchComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(name, email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (!error && data) setComments(data);
  }

  // RBAC: Can the current user edit/delete this task?
  // PM cannot edit/delete tasks created by Admin
  function canEditTask() {
    if (!task || !userProfile) return false;
    if (isAdmin) return true;
    if (isPM && task.visibility_role === "admin") return false; // admin-restricted
    if (task.created_by === user.id) return true;
    return false;
  }

  async function addComment() {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        user_id: user.id,
        comment: newComment.trim(),
      });

      if (!error) {
        // Notify task owner
        if (task.created_by !== user.id) {
          await supabase.from("notifications").insert({
            user_id: task.created_by,
            message: `💬 ${userProfile?.name || user.email} commented on "${task.title}"`,
            is_read: false,
          });
        }
        setNewComment("");
        fetchComments();
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setCommentLoading(false);
    }
  }

  async function deleteComment(commentId) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) fetchComments();
  }

  async function changeStatus(newStatus) {
    setStatusChanging(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    if (!error) {
      setTask((t) => ({ ...t, status: newStatus }));
      onTaskUpdated?.();
    }
    setStatusChanging(false);
  }

  function copyShareLink() {
    if (!task?.share_token) return;
    const url = `${window.location.origin}/share/${task.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!task) return null;

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";
  const canEdit = canEditTask();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${PRIORITY_COLORS[task.priority] || "bg-gray-100 text-gray-600"}`}>
                {task.priority}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${LABEL_COLORS[task.label] || "bg-gray-100 text-gray-600"}`}>
                {task.label}
              </span>
              {isOverdue && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                  ⚠️ Overdue
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                {task.description}
              </p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status — anyone can change */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</h3>
              <select
                value={task.status}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={statusChanging}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Due Date</h3>
              <p className={`text-sm font-medium px-3 py-2 rounded-lg ${isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-700"}`}>
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                  : "No due date"}
              </p>
            </div>
          </div>

          {/* Share link */}
          {task.share_token && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Share Link</h3>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/share/${task.share_token}`}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 select-all"
                />
                <button
                  onClick={copyShareLink}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* RBAC notice for PM on admin tasks */}
          {isPM && task.visibility_role === "admin" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              🔒 This task was created with admin-only visibility. You can comment and change status, but cannot edit or delete it.
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Comments ({comments.length})
            </h3>

            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(c.profiles?.name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {c.profiles?.name || c.profiles?.email || "Unknown"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {c.user_id === user.id && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="text-red-400 hover:text-red-600 transition text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <button
                onClick={addComment}
                disabled={commentLoading || !newComment.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition"
              >
                {commentLoading ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer — edit/delete only if allowed */}
        {canEdit && (
          <div className="flex gap-3 p-6 border-t border-gray-100">
            <button
              onClick={() => { onClose(); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
