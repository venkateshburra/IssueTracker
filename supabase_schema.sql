-- ============================================================
-- IssueTracker — Full Schema
-- Run this in your Supabase SQL Editor
-- RLS is intentionally disabled for development
-- ============================================================

-- ── profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name      text,
  email     text UNIQUE,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pm', 'member')),
  created_at timestamptz DEFAULT now()
);

-- ── teams ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ── team_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pm', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- ── sections ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ── tasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done')),
  priority        text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  label           text NOT NULL DEFAULT 'Task' CHECK (label IN ('Bug', 'Feature', 'User Story', 'Task')),
  due_date        date,
  section_id      uuid REFERENCES sections(id) ON DELETE SET NULL,
  assigned_to     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  visibility_role text NOT NULL DEFAULT 'all' CHECK (visibility_role IN ('all', 'admin', 'pm')),
  share_token     text UNIQUE,
  created_at      timestamptz DEFAULT now()
);

-- ── comments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  comment    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message    text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Indexes for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_created_by    ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_section_id    ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_share_token   ON tasks(share_token);
CREATE INDEX IF NOT EXISTS idx_comments_task_id    ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read  ON notifications(user_id, is_read);

-- ── Disable RLS (development) ─────────────────────────────
ALTER TABLE profiles      DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams         DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments      DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ── Auto-create profile on signup (Supabase trigger) ──────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
