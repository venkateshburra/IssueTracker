import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

export default function Comments({ taskId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    if (taskId && user) {
      getComments();
    }
  }, [taskId, user]);

  async function getComments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setComments(data);

        // Fetch user profiles for all comments
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const profiles = {};

        for (const userId of userIds) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (profileData) {
            profiles[userId] = profileData;
          }
        }

        setUserProfiles(profiles);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
    setLoading(false);
  }

  async function addComment() {
    if (!newComment.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        user_id: user.id,
        comment: newComment.trim(),
      });

      if (error) {
        alert("Error adding comment: " + error.message);
        return;
      }

      setNewComment("");
      getComments();

      // Create notification for task creator
      const { data: taskData } = await supabase
        .from("tasks")
        .select("created_by")
        .eq("id", taskId)
        .single();

      if (taskData && taskData.created_by !== user.id) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        await supabase.from("notifications").insert({
          user_id: taskData.created_by,
          message: `${userProfile?.name || "Someone"} commented on your task`,
        });
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  }

  async function deleteComment(commentId, userId) {
    if (userId !== user.id) {
      alert("You can only delete your own comments");
      return;
    }

    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        alert("Error deleting comment: " + error.message);
      } else {
        getComments();
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">💬 Comments</h3>

      {/* Add Comment Form */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addComment();
              }
            }}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
          <button
            onClick={addComment}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Post
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const profile = userProfiles[comment.user_id];
            return (
              <div
                key={comment.id}
                className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {profile?.name?.charAt(0).toUpperCase() || "?"}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {profile?.name || "Unknown User"}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-2">{comment.comment}</p>

                  {comment.user_id === user.id && (
                    <button
                      onClick={() =>
                        deleteComment(comment.id, comment.user_id)
                      }
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
