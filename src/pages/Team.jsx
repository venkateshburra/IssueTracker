import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  pm: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-green-100 text-green-700 border-green-200",
};
const ROLE_LABELS = {
  admin: "Admin",
  pm: "Project Manager",
  member: "Member",
};
const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-purple-400 to-purple-600",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
];

export default function Team() {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (user) getMembers();
  }, [user]);

  async function getMembers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) setMembers(data);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
    setLoading(false);
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      setInviteError("Please enter a valid email");
      return;
    }

    setInviting(true);
    setInviteError("");
    setInviteMsg("");

    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim())
        .single();

      if (existing) {
        setInviteError("This email is already a team member.");
        setInviting(false);
        return;
      }

      // Create auth user with a temporary password
      const tempPassword = Math.random().toString(36).substring(2, 10) + "Aa1!";
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: tempPassword,
        options: { data: { invited: true } },
      });

      if (signUpError) {
        setInviteError("Error inviting: " + signUpError.message);
        setInviting(false);
        return;
      }

      const newUser = signUpData.user;
      if (newUser) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: newUser.id,
          name: inviteEmail.split("@")[0],
          email: inviteEmail.trim(),
          role: inviteRole,
        });

        if (profileError) {
          setInviteError("Profile creation failed: " + profileError.message);
          setInviting(false);
          return;
        }
      }

      setInviteMsg(`✅ Invite sent to ${inviteEmail}. They'll receive an email to set their password.`);
      setInviteEmail("");
      setInviteRole("member");
      getMembers();
    } catch (err) {
      setInviteError(err.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function updateMemberRole(memberId, newRole) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", memberId);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      if (memberId === user.id) refreshProfile();
    }
  }

  async function removeMember(memberId, memberName) {
    if (!confirm(`Remove ${memberName} from the team?`)) return;

    const { error } = await supabase.from("profiles").delete().eq("id", memberId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      alert("Error removing member: " + error.message);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowInviteForm(!showInviteForm); setInviteMsg(""); setInviteError(""); }}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-sm text-sm"
          >
            {showInviteForm ? "Cancel" : "+ Invite Member"}
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">✉️ Invite New Member</h2>

          {inviteMsg && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
              {inviteMsg}
            </div>
          )}
          {inviteError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              ⚠️ {inviteError}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteMember()}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition text-sm"
              >
                <option value="admin">Admin</option>
                <option value="pm">Project Manager</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>

          <button
            onClick={inviteMember}
            disabled={inviting}
            className="mt-4 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            {inviting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Inviting...
              </span>
            ) : (
              "Send Invite"
            )}
          </button>
        </div>
      )}

      {/* Members grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-gray-500 font-medium">No team members yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((member, idx) => {
            const isMe = member.id === user.id;
            const avatarGradient = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const initial = (member.name || member.email || "?").charAt(0).toUpperCase();

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition p-5 ${
                  isMe ? "border-blue-200 ring-2 ring-blue-100" : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${avatarGradient} rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{member.name || "No name"}</h3>
                      {isMe && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">You</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{member.email}</p>
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold border ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Joined {new Date(member.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>

                {/* Actions — only admin can manage others */}
                {isAdmin && !isMe && (
                  <div className="flex gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-xs focus:border-blue-500 outline-none transition"
                    >
                      <option value="admin">Admin</option>
                      <option value="pm">PM</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.id, member.name || member.email)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition"
                    >
                      Remove
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
