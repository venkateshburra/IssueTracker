import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Sections() {
  const { user } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin } = useWorkspace();

  const [name, setName] = useState("");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function getSections() {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false });
      if (!error && data) setSections(data);
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
    setLoading(false);
  }

  async function addSection() {
    // Only admin can create sections
    if (!isWorkspaceAdmin) return;
    if (!name.trim()) { alert("Section name is required"); return; }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("sections")
          .update({ name: name.trim() })
          .eq("id", editingId);
        if (error) { alert("Error updating section: " + error.message); return; }
        setEditingId(null);
      } else {
        const { error } = await supabase.from("sections").insert({
          name: name.trim(),
          created_by: user.id,
          workspace_id: activeWorkspace.id,
        });
        if (error) { alert("Error creating section: " + error.message); return; }
      }
      setName("");
      getSections();
    } catch (err) {
      console.error("Error saving section:", err);
    }
  }

  async function deleteSection(id) {
    // Only admin can delete sections
    if (!isWorkspaceAdmin) return;
    if (!confirm("Are you sure you want to delete this section?")) return;
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) alert("Error deleting section: " + error.message);
    else getSections();
  }

  function editSection(section) {
    if (!isWorkspaceAdmin) return;
    setName(section.name);
    setEditingId(section.id);
  }

  useEffect(() => {
    if (user && activeWorkspace) getSections();
  }, [user, activeWorkspace]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sections</h1>
          <p className="text-gray-500 mt-1">Organize tasks into categories</p>
        </div>
      </div>

      {/* Create/Edit Form — only visible to admin */}
      {isWorkspaceAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            {editingId ? "✏️ Edit Section" : "➕ New Section"}
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              placeholder="e.g. Frontend, Backend, Design..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <button
              onClick={addSection}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-sm hover:shadow-md"
            >
              {editingId ? "Update" : "Create Section"}
            </button>
            {editingId && (
              <button
                onClick={() => { setEditingId(null); setName(""); }}
                className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sections Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-gray-500 text-lg font-medium">No sections yet</p>
          {isWorkspaceAdmin && (
            <p className="text-gray-400 text-sm mt-1">Create your first section to organize tasks</p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section, idx) => {
            const colors = [
              "border-blue-500 bg-blue-50",
              "border-indigo-500 bg-indigo-50",
              "border-purple-500 bg-purple-50",
              "border-green-500 bg-green-50",
              "border-orange-500 bg-orange-50",
              "border-pink-500 bg-pink-50",
            ];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={section.id}
                className={`rounded-2xl border-l-4 p-6 shadow-sm hover:shadow-md transition duration-200 ${colorClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{section.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Created {new Date(section.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className="text-2xl">📂</span>
                </div>

                {/* Edit/Delete only for admin */}
                {isWorkspaceAdmin && (
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => editSection(section)}
                      className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg font-semibold transition text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
