import { 
  Task, 
  TaskFormData, 
  TaskStatusFilter,
  TaskFilter, 
  TaskStats, 
  TaskCreateData, 
  TaskUpdateData,
  TaskStatus,
  TaskAttachment,
  TaskNote,
  EmployeeReference,
  Objective
} from '../types';
import { api } from './api';

class TaskService {
  private baseUrl = '/api/tasks';

  async getTasks(filters?: TaskFilter): Promise<Task[]> {
    try {
      // Always use /api/tasks endpoint (not dashboard) for getting tasks with filters
      // Dashboard endpoint only returns stats, not filtered tasks
      const response = await api.get<{ tasks?: Task[]; success?: boolean }>(
        this.baseUrl,
        { params: filters }
      );
      if (response.data?.success === false) {
        console.warn('Task endpoint responded with error:', response.data);
        return [];
      }
      // Response format from /api/tasks is { success: True, tasks: [...] }
      if (Array.isArray(response.data?.tasks)) {
        return response.data.tasks;
      }
      return [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task> {
    try {
      const response = await api.get<{ success: boolean; task?: Task }>(`${this.baseUrl}/${id}`);
      // Backend returns { success: true, task: {...} }
      if (response.data?.task) {
        return response.data.task;
      }
      // Fallback: if response.data is the task itself (shouldn't happen, but handle it)
      if ((response.data as any)?.id) {
        return response.data as unknown as Task;
      }
      throw new Error('Task not found in response');
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error('Failed to fetch task');
    }
  }

  async createTask(taskData: Partial<TaskCreateData>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      // Use title and description (new schema)
      const payload: any = { ...taskData };
      
      console.log('📤 Creating task with payload:', payload);
      const response = await api.post(this.baseUrl, payload);
      console.log('✅ Task created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating task:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create task'
      };
    }
  }

  async updateTask(id: string, updateData: Partial<TaskUpdateData>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const response = await api.put<{ success: boolean; task?: Task; error?: string }>(`${this.baseUrl}/${id}`, updateData);
      console.log('📤 Update task response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating task:', error);
      console.error('Error response data:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update task'
      };
    }
  }

  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete task'
      };
    }
  }

  async getTaskStats(): Promise<TaskStats> {
    try {
      const response = await api.get(`${this.baseUrl}/dashboard`);
      return response.data.stats || {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        waiting: 0,
        not_started: 0
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      // Return default stats if API fails
      return {
        total: 0,
        not_started: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      };
    }
  }

  async getMyTasks(): Promise<Task[]> {
    try {
      const response = await api.get(`${this.baseUrl}/my-tasks`);
      return response.data.tasks || [];
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      return [];
    }
  }

  async getCollaborationTasks(): Promise<Task[]> {
    try {
      const response = await api.get<{ success: boolean; tasks?: Task[] }>(`${this.baseUrl}/collaboration`);
      if (response.data?.success && Array.isArray(response.data.tasks)) {
        return response.data.tasks;
      }
      return [];
    } catch (error) {
      console.error('Error fetching collaboration tasks:', error);
      return [];
    }
  }

  async assignTask(taskId: string, assigneeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/${taskId}/assign`, { assignee_id: assigneeId });
      return response.data;
    } catch (error: any) {
      console.error('Error assigning task:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to assign task'
      };
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Partial<TaskUpdateData> = { status };
      
      // If marking as completed, set completed_at
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const response = await api.put(`${this.baseUrl}/${taskId}`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating task status:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update task status'
      };
    }
  }

  async addTaskComment(taskId: string, comment: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/${taskId}/comments`, { comment });
      return response.data;
    } catch (error: any) {
      console.error('Error adding task comment:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add comment'
      };
    }
  }

  async uploadTaskAttachment(taskId: string, file: File): Promise<{ success: boolean; attachment_url?: string; error?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file); // Backend expects 'file' not 'attachment'
      
      console.log(`📤 Uploading file "${file.name}" (${file.size} bytes, type: ${file.type}) to task ${taskId}`);
      const response = await api.post(`${this.baseUrl}/${taskId}/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      console.log(`📤 Upload response:`, response.data);
      
      if (response.data?.success) {
        console.log(`✅ File uploaded successfully:`, response.data);
        return response.data;
      } else {
        console.warn('⚠️ Upload response indicates failure:', response.data);
        return {
          success: false,
          error: response.data?.error || 'Upload failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Error uploading task attachment:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to upload attachment'
      };
    }
  }

  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    try {
      const response = await api.get<{ success: boolean; attachments?: TaskAttachment[]; total?: number }>(
        `${this.baseUrl}/${taskId}/attachments`
      );
      if (response.data?.success === false) {
        console.warn('Task attachments API returned error:', response.data);
        return [];
      }
      const attachments = response.data.attachments ?? [];
      console.log(`✅ Loaded ${attachments.length} attachments for task ${taskId}`);
      return attachments;
    } catch (error) {
      console.error('Error fetching task attachments:', error);
      return [];
    }
  }

  async getTaskNotes(taskId: string): Promise<TaskNote[]> {
    try {
      const response = await api.get<{ success: boolean; notes?: TaskNote[] }>(
        `${this.baseUrl}/${taskId}/notes`
      );
      if (response.data?.success === false) {
        return [];
      }
      return response.data.notes ?? [];
    } catch (error) {
      console.error('Error fetching task notes:', error);
      return [];
    }
  }

  async addTaskNote(taskId: string, payload: { notes: string; progress?: number; attached_to?: string; attached_to_multiple?: string[] }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const sanitizedPayload = {
        ...payload,
        attached_to_multiple: payload.attached_to_multiple?.filter(Boolean),
      };
      if (!sanitizedPayload.attached_to_multiple?.length) {
        delete sanitizedPayload.attached_to_multiple;
      }
      if (!sanitizedPayload.attached_to) {
        delete sanitizedPayload.attached_to;
      }
      const response = await api.post(`${this.baseUrl}/${taskId}/add-note`, sanitizedPayload);
      return response.data;
    } catch (error: any) {
      console.error('Error adding task note:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add note'
      };
    }
  }

  async getAvailableEmployeesForAttachment(taskId: string): Promise<{ success: boolean; employees?: EmployeeReference[]; total?: number; error?: string }> {
    try {
      const response = await api.get(`/api/tasks/${taskId}/available-employees`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching available employees for attachment:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load employees',
        employees: [],
      };
    }
  }

  // Helper method to get tasks for dashboard
  async getDashboardTasks(userId?: string): Promise<{ recent: Task[]; overdue: Task[]; assigned: Task[] }> {
    try {
      // Get tasks with different filters for dashboard
      const [recentTasks, overdueTasks, assignedTasks] = await Promise.all([
        this.getTasks({ assigned_to: userId, status: 'all' }).then(tasks => 
          tasks.slice(0, 5).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ),
        this.getTasks({ assigned_to: userId, status: 'not_started' }).then(tasks =>
          tasks.filter(task => task.due_date && new Date(task.due_date) < new Date())
        ),
        this.getTasks({ assigned_to: userId, status: 'not_started' }).then(tasks => tasks.slice(0, 10))
      ]);

      return {
        recent: recentTasks,
        overdue: overdueTasks,
        assigned: assignedTasks
      };
    } catch (error) {
      console.error('Error fetching dashboard tasks:', error);
      return {
        recent: [],
        overdue: [],
        assigned: []
      };
    }
  }

  // Helper method to calculate task statistics
  async calculateTaskStats(tasks: Task[]): Promise<TaskStats> {
    const now = new Date();
    
    const stats: TaskStats = {
      total: tasks.length,
      not_started: tasks.filter(task => task.status === 'not_started').length,
      in_progress: tasks.filter(task => task.status === 'in_progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
      cancelled: tasks.filter(task => task.status === 'cancelled').length
    };

    return stats;
  }

  async getTasksByStatus(status: TaskStatusFilter, userId?: string) {
    return this.getTasks({
      status: status === 'all' ? undefined : status,
      assigned_to: userId
    });
  }

  // Search tasks
  async searchTasks(query: string, filters?: TaskFilter): Promise<Task[]> {
    try {
      const response = await api.get(this.baseUrl, { 
        params: { ...filters, search: query } 
      });
      return response.data.tasks || [];
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  // Objectives API methods
  async getObjectives(): Promise<Objective[]> {
    try {
      const response = await api.get('/api/objectives');
      return response.data.objectives || [];
    } catch (error) {
      console.error('Error fetching objectives:', error);
      return [];
    }
  }

  async getObjectiveById(id: string): Promise<Objective> {
    try {
      const response = await api.get(`/api/objectives/${id}`);
      return response.data.objective;
    } catch (error) {
      console.error('Error fetching objective:', error);
      throw new Error('Failed to fetch objective');
    }
  }

  async createObjective(objectiveData: Partial<Objective>): Promise<{ success: boolean; objective?: Objective; error?: string }> {
    try {
      const response = await api.post('/api/objectives', objectiveData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating objective:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create objective'
      };
    }
  }

  async updateObjective(id: string, updateData: Partial<Objective>): Promise<{ success: boolean; objective?: Objective; error?: string }> {
    try {
      const response = await api.put(`/api/objectives/${id}`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating objective:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update objective'
      };
    }
  }

  async deleteObjective(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/api/objectives/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting objective:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete objective'
      };
    }
  }

  // Task Updates API
  async getTaskUpdates(taskId: string): Promise<TaskNote[]> {
    try {
      const response = await api.get(`/api/tasks/${taskId}/updates`);
      return response.data.updates || [];
    } catch (error) {
      console.error('Error fetching task updates:', error);
      return [];
    }
  }

  async createTaskUpdate(taskId: string, updateData: { notes?: string; progress?: number }): Promise<{ success: boolean; update?: TaskNote; error?: string }> {
    try {
      const response = await api.post(`/api/tasks/${taskId}/updates`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating task update:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create task update'
      };
    }
  }
}

const taskService = new TaskService();

export { taskService };
export default taskService;