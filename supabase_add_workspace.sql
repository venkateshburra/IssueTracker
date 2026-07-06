-- ============================================================
-- ADD WORKSPACE SUPPORT — Safe, does NOT touch existing tables
-- Just run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create workspaces table (new)
CREATE TABLE IF NOT EXISTS workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Create workspace_members table (new)
CREATE TABLE IF NOT EXISTS workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pm', 'member')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Step 3: Add workspace_id column to sections (if not already there)
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

-- Step 4: Add workspace_id column to tasks (if not already there)
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

-- Step 5: Disable RLS on new tables
ALTER TABLE workspaces        DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Done!
SELECT 'Workspace tables added successfully!' AS status;
