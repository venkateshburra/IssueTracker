import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    getNotifications();

    // Check overdue tasks and generate notifications
    checkOverdueTasks();

    // Real-time subscription
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => getNotifications()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    if (user) getNotifications();
  }, [filterUnread]);

  async function checkOverdueTasks() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: overdue } = await supabase
        .from("tasks")
        .select("id, title")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .lt("due_date", today)
        .neq("status", "Done");

      if (!overdue?.length) return;

      for (const task of overdue) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .like("message", `%overdue%"${task.title}"%`)
          .gte("created_at", `${today}T00:00:00`);

        if (!existing?.length) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            message: `⏰ Task "${task.title}" is overdue and needs attention!`,
            is_read: false,
          });
        }
      }
      getNotifications();
    } catch (err) {
      console.error("Overdue check error:", err);
    }
  }

  async function getNotifications() {
    setLoading(true);
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);

      if (filterUnread) query = query.eq("is_read", false);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
    setLoading(false);
  }

  async function markAsRead(id) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  async function deleteNotification(id) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function deleteAll() {
    if (!confirm("Delete all notifications?")) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    if (!error) setNotifications([]);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? (
              <span className="text-blue-600 font-semibold">{unreadCount} unread</span>
            ) : (
              "All caught up"
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              ✓ Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={deleteAll}
              className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-semibold text-sm transition"
            >
              🗑 Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <div
            onClick={() => setFilterUnread(!filterUnread)}
            className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center px-1 cursor-pointer ${
              filterUnread ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${filterUnread ? "translate-x-5" : "translate-x-0"}`}></div>
          </div>
          <span className="text-sm font-semibold text-gray-700">Show unread only</span>
        </label>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">📪</div>
          <p className="text-gray-500 font-medium">
            {filterUnread ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            You'll see alerts here when tasks are assigned, commented on, or overdue
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition ${
                notif.is_read
                  ? "bg-white border-gray-100 opacity-70"
                  : "bg-white border-blue-100 shadow-sm"
              }`}
            >
              {/* Unread dot */}
              <div className="flex-shrink-0 mt-1">
                {notif.is_read ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${notif.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                  {notif.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 hover:bg-blue-50 rounded-lg transition"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded-lg transition font-semibold"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
