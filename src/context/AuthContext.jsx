import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

const AuthContext = createContext();

async function ensureProfileExists(user) {
  if (!user) return null;

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existing) return existing;

    // Profile missing — create it
    const newProfile = {
      id: user.id,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split("@")[0],
      email: user.email,
      role: "member",
    };

    const { data: created, error } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }
    return created;
  } catch (err) {
    console.error("ensureProfileExists error:", err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setUserProfile(null);
      return;
    }
    const profile = await ensureProfileExists(authUser);
    setUserProfile(profile);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore token refresh events — they don't change the user
      // and cause unnecessary re-renders when switching tabs
      if (event === "TOKEN_REFRESHED") return;

      const currentUser = session?.user ?? null;

      // Only update state if user actually changed
      setUser((prevUser) => {
        if (prevUser?.id === currentUser?.id) return prevUser;
        return currentUser;
      });

      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        await loadProfile(currentUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper to refresh profile from DB (e.g. after role change)
  async function refreshProfile() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setUserProfile(data);
  }

  const isAdmin = userProfile?.role === "admin";
  const isPM = userProfile?.role === "pm";
  const isMember = userProfile?.role === "member";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        setUserProfile,
        refreshProfile,
        loading,
        isAdmin,
        isPM,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
