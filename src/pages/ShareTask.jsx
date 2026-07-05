import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../utils/supabase";

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

export default function ShareTask() {
  const { token } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchTask();
  }, [token]);

  async function fetchTask() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("share_token", token)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setTask(data);
        fetchComments(data.id);
      }
    } catch (err) {
      setNotFound(true);
    }
    setLoading(false);
  }

  async function fetchComments(taskId) {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(name, email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h1>
          <p className="text-gray-500 mb-6">This shared task link is invalid or has been removed.</p>
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "Done";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4 md:p-8">
      {/* Header bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-xl">📋</span>
            <span className="font-bold text-white">IssueTracker</span>
          </div>
          <Link
            to="/"
            className="text-white/70 hover:text-white text-sm font-medium transition"
          >
            Sign In →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Task header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white`}>
                {task.label}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white`}>
                {task.priority}
              </span>
              {isOverdue && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white">
                  ⚠️ Overdue
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{task.title}</h1>
          </div>

          <div className="p-7 space-y-6">
            {/* Shared notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-start gap-2">
              <span>🔗</span>
              <span>This task was shared with you via a public link. Sign in to collaborate.</span>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                  {task.description}
                </p>
              </div>
            )}

            {/* Status & details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</h2>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_COLORS[task.status]}`}>
                  {task.status}
                </span>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Priority</h2>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
              {task.due_date && (
                <div className="col-span-2">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Due Date</h2>
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
                    📅 {new Date(task.due_date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
                    {isOverdue && " — Overdue"}
                  </p>
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Comments ({comments.length})
              </h2>
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-xl">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.profiles?.name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {c.profiles?.name || c.profiles?.email}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm text-gray-500 mb-3">Want to add comments or manage this task?</p>
              <Link
                to="/"
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                Sign in to IssueTracker →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Shared via IssueTracker • View only
        </p>
      </div>
    </div>
  );
}
