export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TaskStatusFilter = TaskStatus | 'all';

export interface Objective {
  id?: string;
  title: string;
  description?: string;
  deadline?: string;
  department?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  created_by?: string;
  is_admin_created?: boolean;
  created_at?: string;
  updated_at?: string;
  tasks?: Task[];
}

export interface EmployeeReference {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
}

// Removed AI-related interfaces (StrategicAnalysis, EmployeeRecommendation, StrategicMetadata)

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_multiple?: string[];
  created_by: string;
  created_by_name?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  completion_percentage?: number;
  notes?: string;
  objective_id?: string;
  objectives?: Objective;
  is_admin_created?: boolean;
  is_standalone?: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_to_multiple?: string[];
  due_date?: string;
  objective_id?: string;
  notes?: string;
  completion_percentage?: number;
}

export interface TaskCreateData extends TaskFormData {
  created_by: string;
}

export interface TaskUpdateData extends Partial<TaskFormData> {
  id: string;
  completed_at?: string;
  completion_percentage?: number;
  notes?: string;
}

export interface TaskFilter {
  status?: TaskStatusFilter;
  priority?: string;
  assigned_to?: string;
  created_by?: string;
  due_date_from?: string;
  due_date_to?: string;
  objective_id?: string;
  assignment?: 'All' | 'Assigned' | 'Unassigned';
  employee_filter?: string;
  priority_filter?: string;
  objective_filter?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  not_started: number;
  in_progress: number;
  cancelled: number;
  objectives?: number;
}

export interface TaskDashboard {
  stats: TaskStats;
  tasks: Task[];
  recent_tasks?: Task[];
}

// Removed Goal interface - use Objective instead

export interface TaskAttachment {
  id?: string;
  task_id?: string;
  filename?: string;
  file_name?: string;
  file_type?: string;
  file_url?: string;
  file_size?: number;
  public_url?: string;
  employee_id?: string;
  employee_name?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  notes?: string;
  created_at?: string;
  update_id?: string;
}

export interface TaskNote {
  id: string;
  task_id?: string;
  updated_by?: string;
  updated_by_name?: string;
  employee_name?: string; // For display purposes (from joined employee data)
  employee_role?: string; // For display purposes
  notes?: string;
  progress?: number;
  attachments?: TaskAttachment[];
  attachments_count?: number; // For display purposes
  created_at?: string;
}

export interface Notification {
  id: string;
  message: string;
  type:
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'task_assigned'
    | 'task_updated'
    | 'file_uploaded'
    | 'note_added';
  is_read: boolean;
  meta?: {
    task_id?: string;
    task_description?: string;
    assigned_by?: string;
    note_preview?: string;
    file_name?: string;
  };
  created_at: string;
  read_at?: string;
}

// Removed AI-related response interfaces

export interface TaskServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  tasks?: Task[];
  task?: Task;
    objectives?: Objective[];
    objective?: Objective;
  stats?: TaskStats;
  dashboard?: TaskDashboard;
  notes?: TaskNote[];
  attachments?: TaskAttachment[];
  total?: number;
  unread_count?: number;
  notifications?: Notification[];
  available_dependencies?: Task[];
  available_employees?: EmployeeReference[];
}

export interface TaskActionState {
  show_edit_form: boolean;
  editing?: boolean;
  status?: string;
  priority?: string;
  progress?: number;
}

export interface TaskFilterOptions {
  status: string;
  assignment: string;
  employee_filter: string;
  priority_filter: string;
  objective_filter: string;
  sort_by: string;
  start_date?: Date;
  end_date?: Date;
}

export interface TaskProposal {
  title: string;
  description: string;
  detailed_description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  goal_id?: string;
  assign_suggestion: string;
  estimated_hours?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
  updated_at: string;
}
 