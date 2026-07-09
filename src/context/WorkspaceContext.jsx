import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaceRole, setWorkspaceRole] = useState("member"); // role in active workspace
  const [loading, setLoading] = useState(true);

  // Load workspaces the user is a member of
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }
    // Only reload if user id actually changed (not just a new object reference)
    loadWorkspaces();
  }, [user?.id]); // ← use user.id not user object

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspaces(id, name, created_by, created_at)")
        .eq("user_id", user.id);

      if (error) throw error;

      const list = (data || [])
        .filter((row) => row.workspaces) // skip if workspace was deleted
        .map((row) => ({
          ...row.workspaces,
          myRole: row.role,
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setWorkspaces(list);

      // Restore last active workspace from localStorage
      const savedId = localStorage.getItem(`activeWorkspace_${user.id}`);
      const saved = list.find((w) => w.id === savedId);
      const initial = saved || list[0] || null;

      setActiveWorkspace(initial);
      setWorkspaceRole(initial?.myRole || "member");
    } catch (err) {
      console.error("Error loading workspaces:", err);
    }
    setLoading(false);
  }

  function switchWorkspace(workspace) {
    setActiveWorkspace(workspace);
    setWorkspaceRole(workspace.myRole || "member");
    localStorage.setItem(`activeWorkspace_${user.id}`, workspace.id);
  }

  async function createWorkspace(name) {
    if (!user) return { error: "Not authenticated" };
    if (!name.trim()) return { error: "Name required" };

    try {
      // Create workspace
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .insert({ name: name.trim(), created_by: user.id })
        .select()
        .single();

      if (wsErr) return { error: wsErr.message };

      // Add creator as admin member
      const { error: memberErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: user.id, role: "admin" });

      if (memberErr) return { error: memberErr.message };

      const newWs = { ...ws, myRole: "admin" };
      setWorkspaces((prev) => [newWs, ...prev]);
      switchWorkspace(newWs);

      return { data: newWs };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function inviteToWorkspace(email, role = "member") {
    if (!activeWorkspace) return { error: "No active workspace" };

    try {
      // Find user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("email", email.trim())
        .single();

      if (!profile) {
        // User doesn't exist — create via Supabase Auth invite
        const tempPassword =
          Math.random().toString(36).substring(2, 10) + "Aa1!";

        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: tempPassword,
        });

        if (signUpErr) return { error: signUpErr.message };

        const newUser = signUpData.user;
        if (!newUser) return { error: "Signup failed — please try again" };

        // Create profile
        await supabase.from("profiles").upsert({
          id: newUser.id,
          name: email.split("@")[0],
          email: email.trim(),
          role,
        });

        // Add as workspace member
        const { error: memberErr } = await supabase
          .from("workspace_members")
          .insert({ workspace_id: activeWorkspace.id, user_id: newUser.id, role });

        if (memberErr) return { error: memberErr.message };

        // Notify
        await supabase.from("notifications").insert({
          user_id: newUser.id,
          message: `🎉 You were invited to workspace "${activeWorkspace.name}"`,
          is_read: false,
        });

        return { success: true, message: `Invite sent to ${email}` };
      }

      // User exists — check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", activeWorkspace.id)
        .eq("user_id", profile.id)
        .single();

      if (existing) return { error: `${email} is already a workspace member` };

      // Add as member
      const { error: memberErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: activeWorkspace.id, user_id: profile.id, role });

      if (memberErr) return { error: memberErr.message };

      // Update their global profile role if higher
      const rolePriority = { admin: 3, pm: 2, member: 1 };
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", profile.id)
        .single();

      if (
        currentProfile &&
        (rolePriority[role] || 0) > (rolePriority[currentProfile.role] || 0)
      ) {
        await supabase.from("profiles").update({ role }).eq("id", profile.id);
      }

      // Notify
      await supabase.from("notifications").insert({
        user_id: profile.id,
        message: `🎉 You were added to workspace "${activeWorkspace.name}"`,
        is_read: false,
      });

      return { success: true, message: `${profile.name || email} added to workspace` };
    } catch (err) {
      return { error: err.message };
    }
  }

  // Workspace-scoped admin/pm check
  const isWorkspaceAdmin = workspaceRole === "admin";
  const isWorkspacePM = workspaceRole === "pm";

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        workspaceRole,
        isWorkspaceAdmin,
        isWorkspacePM,
        loading,
        loadWorkspaces,
        switchWorkspace,
        createWorkspace,
        inviteToWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
