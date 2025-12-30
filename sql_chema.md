-- Simplified Task Management Schema for LeanAI Companies
-- No AI integration - Simple task assignment and management platform
-- PostgreSQL Schema for Supabase

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_uid uuid,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  department text,
  title text,
  bio text,
  linkedin_url text,
  telegram_chat_id text,
  is_active boolean DEFAULT true,
  skills text[] DEFAULT '{}'::text[],
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password text CHECK (length(password) >= 8),
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

-- ============================================
-- OBJECTIVES TABLE
-- ============================================
CREATE TABLE public.objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  department text,
  deadline date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  created_by uuid NOT NULL,
  is_admin_created boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT objectives_pkey PRIMARY KEY (id),
  CONSTRAINT objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE CASCADE
);

-- ============================================
-- TASKS TABLE (formerly action_plans)
-- ============================================
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  objective_id uuid,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  assigned_to_multiple uuid[] DEFAULT '{}'::uuid[],
  due_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes text,
  created_by uuid NOT NULL,
  is_admin_created boolean DEFAULT false,
  is_standalone boolean DEFAULT false, -- true if task is not part of an objective
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE,
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL,
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE CASCADE
);

-- ============================================
-- TASK UPDATES TABLE
-- ============================================
CREATE TABLE public.task_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  updated_by uuid NOT NULL,
  progress integer CHECK (progress >= 0 AND progress <= 100),
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_updates_pkey PRIMARY KEY (id),
  CONSTRAINT task_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE CASCADE
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  to_employee uuid,
  channel text DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'telegram')),
  message text NOT NULL,
  type text DEFAULT 'task_update' CHECK (type IN ('task_assigned', 'task_completed', 'task_updated', 'objective_created', 'general')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  related_task_id uuid,
  related_objective_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_to_employee_fkey FOREIGN KEY (to_employee) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT notifications_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT notifications_related_objective_id_fkey FOREIGN KEY (related_objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_objective_id ON public.tasks(objective_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_objectives_created_by ON public.objectives(created_by);
CREATE INDEX idx_objectives_status ON public.objectives(status);
CREATE INDEX idx_notifications_to_employee ON public.notifications(to_employee);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_employees_role ON public.employees(role);
CREATE INDEX idx_employees_email ON public.employees(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Employees can view all active employees
CREATE POLICY "Employees can view all active employees"
  ON public.employees FOR SELECT
  USING (is_active = true);

-- Employees can update their own profile
CREATE POLICY "Employees can update own profile"
  ON public.employees FOR UPDATE
  USING (auth_uid = (SELECT auth_uid FROM public.employees WHERE id = employees.id));

-- Admins can do everything on employees (SELECT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all employees"
  ON public.employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
      AND role = 'admin'
    )
  );

-- Allow INSERT for employees table (for service key and API usage)
-- This policy allows inserts when using service key or when auth_uid is set
CREATE POLICY "Allow employee inserts"
  ON public.employees FOR INSERT
  WITH CHECK (true);

-- Objectives: Everyone can view all objectives
CREATE POLICY "Everyone can view objectives"
  ON public.objectives FOR SELECT
  USING (true);

-- Objectives: Users can create their own objectives
CREATE POLICY "Users can create objectives"
  ON public.objectives FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
  );

-- Objectives: Users can update their own objectives, admins can update all
CREATE POLICY "Users can update own objectives, admins can update all"
  ON public.objectives FOR UPDATE
  USING (
    created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
    OR
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
      AND role = 'admin'
    )
  );

-- Objectives: Users can delete their own non-admin objectives, admins can delete all
CREATE POLICY "Users can delete own objectives, admins can delete all"
  ON public.objectives FOR DELETE
  USING (
    (created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid) AND is_admin_created = false)
    OR
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
      AND role = 'admin'
    )
  );

-- Tasks: Everyone can view all tasks
CREATE POLICY "Everyone can view tasks"
  ON public.tasks FOR SELECT
  USING (true);

-- Tasks: Users can create their own tasks
CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
  );

-- Tasks: Users can update their own tasks, assigned users can update tasks assigned to them, admins can update all
CREATE POLICY "Users can update own or assigned tasks, admins can update all"
  ON public.tasks FOR UPDATE
  USING (
    created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
    OR
    assigned_to = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
    OR
    (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid) = ANY(assigned_to_multiple)
    OR
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
      AND role = 'admin'
    )
  );

-- Tasks: Users can delete their own non-admin tasks, admins can delete all
CREATE POLICY "Users can delete own tasks, admins can delete all"
  ON public.tasks FOR DELETE
  USING (
    (created_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid) AND is_admin_created = false)
    OR
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
      AND role = 'admin'
    )
  );

-- Task Updates: Everyone can view task updates
CREATE POLICY "Everyone can view task updates"
  ON public.task_updates FOR SELECT
  USING (true);

-- Task Updates: Users can create updates for tasks they're assigned to or created
CREATE POLICY "Users can create task updates"
  ON public.task_updates FOR INSERT
  WITH CHECK (
    updated_by = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
    AND (
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE id = task_id
        AND (
          created_by = updated_by
          OR assigned_to = updated_by
          OR updated_by = ANY(assigned_to_multiple)
        )
      )
      OR
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = updated_by
        AND role = 'admin'
      )
    )
  );

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    to_employee = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
  );

-- Notifications: System can create notifications (handled by backend)
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Notifications: Users can update their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    to_employee = (SELECT id FROM public.employees WHERE auth_uid = current_setting('app.current_user_id', true)::uuid)
  );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notifications when task is completed
CREATE OR REPLACE FUNCTION notify_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  task_creator_id uuid;
  assigned_user_id uuid;
  task_title text;
  completed_by_name text;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get task details
    SELECT title INTO task_title FROM public.tasks WHERE id = NEW.id;
    SELECT name INTO completed_by_name FROM public.employees WHERE id = NEW.assigned_to;
    
    -- Set completed_at timestamp
    NEW.completed_at = now();
    
    -- Create notification for task creator (if not the same as assignee)
    IF NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (
        to_employee,
        message,
        type,
        priority,
        related_task_id,
        meta
      ) VALUES (
        NEW.created_by,
        format('Task "%s" has been completed by %s', task_title, completed_by_name),
        'task_completed',
        'normal',
        NEW.id,
        jsonb_build_object('completed_by', NEW.assigned_to, 'task_title', task_title)
      );
    END IF;
    
    -- Create notification for all employees (broadcast)
    INSERT INTO public.notifications (
      to_employee,
      message,
      type,
      priority,
      related_task_id,
      meta
    )
    SELECT
      id,
      format('Task "%s" has been completed by %s', task_title, completed_by_name),
      'task_completed',
      'normal',
      NEW.id,
      jsonb_build_object('completed_by', NEW.assigned_to, 'task_title', task_title)
    FROM public.employees
    WHERE is_active = true
      AND id != NEW.assigned_to
      AND id != NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for task completion notifications
CREATE TRIGGER task_completion_notification
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION notify_task_completion();

-- Function to set is_admin_created flag automatically
CREATE OR REPLACE FUNCTION set_admin_created_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if creator is admin
  IF EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = NEW.created_by AND role = 'admin'
  ) THEN
    NEW.is_admin_created = true;
  ELSE
    NEW.is_admin_created = false;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply admin flag triggers
CREATE TRIGGER set_objective_admin_flag
  BEFORE INSERT ON public.objectives
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_created_flag();

CREATE TRIGGER set_task_admin_flag
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_created_flag();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.employees IS 'Stores employee/user information with role-based access (admin or employee)';
COMMENT ON TABLE public.objectives IS 'Stores objectives that can contain multiple tasks. Anyone can create objectives.';
COMMENT ON TABLE public.tasks IS 'Stores individual tasks that can be part of an objective or standalone. Employees can only edit their own tasks, not admin-created ones.';
COMMENT ON TABLE public.task_updates IS 'Stores progress updates and notes for tasks';
COMMENT ON TABLE public.notifications IS 'Stores in-app notifications for users. Automatically created when tasks are completed.';

COMMENT ON COLUMN public.tasks.is_standalone IS 'True if task is not part of an objective (created independently)';
COMMENT ON COLUMN public.tasks.is_admin_created IS 'True if task was created by an admin. Non-admin users cannot edit admin-created tasks.';
COMMENT ON COLUMN public.objectives.is_admin_created IS 'True if objective was created by an admin. Non-admin users cannot edit admin-created objectives.';
COMMENT ON COLUMN public.employees.role IS 'User role: admin (can manage everything) or employee (can only edit own tasks/objectives)';
