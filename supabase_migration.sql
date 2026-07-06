-- ============================================================
-- IssueTracker — Safe Migration Script
-- Run this in Supabase SQL Editor
-- Handles both fresh installs AND existing tables
-- ============================================================

-- ── Step 1: profiles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  email      text UNIQUE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pm', 'member')),
  created_at timestamptz DEFAULT now()
);

-- ── Step 2: workspaces (NEW) ──────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Step 3: workspace_members (NEW) ───────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pm', 'member')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- ── Step 4: sections — add workspace_id if missing ────────
CREATE TABLE IF NOT EXISTS sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- If sections table already existed without workspace_id, add the column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'sections'
      AND column_name  = 'workspace_id'
  ) THEN
    ALTER TABLE sections ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── Step 5: tasks — add workspace_id if missing ───────────
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces(id) ON DELETE CASCADE,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'workspace_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add share_token column if tasks table existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'share_token'
  ) THEN
    ALTER TABLE tasks ADD COLUMN share_token text UNIQUE;
  END IF;
END $$;

-- Add visibility_role column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'visibility_role'
  ) THEN
    ALTER TABLE tasks ADD COLUMN visibility_role text NOT NULL DEFAULT 'all'
      CHECK (visibility_role IN ('all', 'admin', 'pm'));
  END IF;
END $$;

-- ── Step 6: comments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  comment    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Step 7: notifications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message    text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Step 8: Drop old teams tables if they exist ───────────
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ── Step 9: Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user      ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sections_workspace          ON sections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace             ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by            ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to           ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_section_id            ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_share_token           ON tasks(share_token);
CREATE INDEX IF NOT EXISTS idx_comments_task_id            ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user          ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read          ON notifications(user_id, is_read);

-- ── Step 10: Disable RLS ──────────────────────────────────
ALTER TABLE profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections          DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     DISABLE ROW LEVEL SECURITY;

-- ── Step 11: Auto-create profile trigger ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
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

-- ── Done ──────────────────────────────────────────────────
SELECT 'Migration complete! Tables created: profiles, workspaces, workspace_members, sections, tasks, comments, notifications' AS status;
