import React, { useEffect, useState, useMemo } from 'react';
import { taskService } from '../../services/task';
import { employeeService } from '../../services/employee';
import { Task, EmployeeReference, Objective } from '../../types';
import { Employee } from '../../types/employee';
import { ObjectiveList } from '../../components/TaskManagement/ObjectiveList';
import { ObjectiveForm } from '../../components/TaskManagement/ObjectiveForm';
import { TaskForm } from '../../components/TaskManagement/TaskForm';
import { TaskList } from '../../components/TaskManagement/TaskList';
import './TaskManagement.css';

type TaskFilterState = {
  status: 'all' | Task['status'];
  priority: 'all' | Task['priority'];
  assigned_to: 'all' | string;
  objective: 'all' | string;
  created_by: 'all' | string;
  sortBy: 'due_date' | 'priority' | 'status' | 'recent' | 'created_at';
  search: string;
};

type ObjectiveFilterState = {
  status: 'all' | Objective['status'];
  department: 'all' | string;
  created_by: 'all' | string;
  priority: 'all' | Objective['priority'];
  sortBy: 'deadline' | 'priority' | 'status' | 'recent' | 'created_at';
  search: string;
};

const TaskManagement: React.FC = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'objectives' | 'tasks'>('objectives');
  
  // Filter states
  const [taskFilters, setTaskFilters] = useState<TaskFilterState>({
    status: 'all',
    priority: 'all',
    assigned_to: 'all',
    objective: 'all',
    created_by: 'all',
    sortBy: 'due_date',
    search: ''
  });
  
  const [objectiveFilters, setObjectiveFilters] = useState<ObjectiveFilterState>({
    status: 'all',
    department: 'all',
    created_by: 'all',
    priority: 'all',
    sortBy: 'deadline',
    search: ''
  });
  
  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger to refresh tasks in objectives

  useEffect(() => {
    loadObjectives();
    loadAllEmployees();
    loadAllTasks();
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadAllTasks();
    }
  }, [activeTab]);

  const loadAllEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const data = await employeeService.getAllEmployees(true);
      let employeesList: Employee[] = [];
      if (Array.isArray(data)) {
        employeesList = data;
      } else if (data && typeof data === 'object' && 'employees' in data) {
        employeesList = Array.isArray((data as any).employees) ? (data as any).employees : [];
      } else if (data && typeof data === 'object' && 'data' in data) {
        employeesList = Array.isArray((data as any).data) ? (data as any).data : [];
      }
      setAllEmployees(employeesList);
    } catch (err) {
      console.error('❌ Failed to load employees:', err);
      setAllEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const loadObjectives = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskService.getObjectives();
      setObjectives(data);
    } catch (err) {
      setError('Failed to load objectives');
      console.error('Error loading objectives:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = (objectiveId?: string) => {
    setEditingTask(null);
    setSelectedObjectiveId(objectiveId || null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedObjectiveId(task.objective_id || null);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const result = await taskService.deleteTask(taskId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete task');
        }
        await loadObjectives(); // Reload to refresh task lists
        await loadAllTasks(); // Reload all tasks view
        setRefreshTrigger(prev => prev + 1); // Trigger refresh of tasks
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error deleting task: ${message}`);
      }
    }
  };

  const handleCreateObjective = () => {
    setEditingObjective(null);
    setShowObjectiveForm(true);
  };

  const handleEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setShowObjectiveForm(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      setError('');
      if (editingTask) {
        const result = await taskService.updateTask(editingTask.id, taskData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update task');
        }
      } else {
        // For new tasks, use selectedObjectiveId if provided, otherwise use taskData.objective_id (which can be null for standalone tasks)
        // Convert null to undefined for TypeScript compatibility
        const finalObjectiveId = selectedObjectiveId !== null ? selectedObjectiveId : (taskData.objective_id !== undefined ? taskData.objective_id : undefined);
        const result = await taskService.createTask({
          ...taskData,
          objective_id: finalObjectiveId
        });
        if (!result.success) {
          throw new Error(result.error || 'Failed to create task');
        }
      }
      setShowTaskForm(false);
      setEditingTask(null);
      setSelectedObjectiveId(null);
      await loadObjectives(); // Reload to refresh task lists
      await loadAllTasks(); // Reload all tasks view
      // Trigger refresh of tasks for the objective
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error ${editingTask ? 'updating' : 'creating'} task: ${message}`);
    }
  };

  const handleSaveObjective = async (objectiveData: Partial<Objective>) => {
    try {
      setError('');
      if (editingObjective?.id) {
        const result = await taskService.updateObjective(editingObjective.id, objectiveData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update objective');
        }
                        } else {
        const result = await taskService.createObjective(objectiveData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to create objective');
        }
      }
      setShowObjectiveForm(false);
      setEditingObjective(null);
      await loadObjectives();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error ${editingObjective ? 'updating' : 'creating'} objective: ${message}`);
    }
  };

  const handleDeleteObjective = async (objectiveId: string) => {
    if (window.confirm('Are you sure you want to delete this objective? All tasks in this objective will also be deleted.')) {
      try {
        const result = await taskService.deleteObjective(objectiveId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete objective');
        }
        await loadObjectives();
        await loadAllTasks(); // Reload all tasks view
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error deleting objective: ${message}`);
      }
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const result = await taskService.updateTaskStatus(taskId, newStatus);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task status');
      }
      await loadAllTasks();
      await loadObjectives();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error updating task status: ${message}`);
    }
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply filters
    if (taskFilters.status !== 'all') {
      filtered = filtered.filter(task => task.status === taskFilters.status);
    }

    if (taskFilters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === taskFilters.priority);
    }

    if (taskFilters.assigned_to !== 'all') {
      filtered = filtered.filter(task => 
        task.assigned_to === taskFilters.assigned_to ||
        (task.assigned_to_multiple || []).includes(taskFilters.assigned_to)
      );
    }

    if (taskFilters.objective !== 'all') {
      filtered = filtered.filter(task => task.objective_id === taskFilters.objective);
    }

    if (taskFilters.created_by !== 'all') {
      filtered = filtered.filter(task => task.created_by === taskFilters.created_by);
    }

    // Search filter
    if (taskFilters.search) {
      const query = taskFilters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        (task.assigned_to_name || '').toLowerCase().includes(query) ||
        (task.objectives?.title || '').toLowerCase().includes(query)
      );
    }

    // Sort
    switch (taskFilters.sortBy) {
      case 'due_date':
        filtered.sort((a, b) => {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          return aDate - bDate;
        });
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        });
        break;
      case 'status':
        filtered.sort((a, b) => {
          const aStatus = a.status || '';
          const bStatus = b.status || '';
          return aStatus.localeCompare(bStatus);
        });
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const aDate = a.updated_at || a.created_at || '';
          const bDate = b.updated_at || b.created_at || '';
          return bDate.localeCompare(aDate);
        });
        break;
      case 'created_at':
        filtered.sort((a, b) => {
          const aDate = a.created_at || '';
          const bDate = b.created_at || '';
          return bDate.localeCompare(aDate);
        });
        break;
    }

    return filtered;
  }, [tasks, taskFilters]);

  // Filter and sort objectives
  const filteredObjectives = useMemo(() => {
    let filtered = [...objectives];

    // Apply filters
    if (objectiveFilters.status !== 'all') {
      filtered = filtered.filter(obj => obj.status === objectiveFilters.status);
    }

    if (objectiveFilters.department !== 'all') {
      filtered = filtered.filter(obj => obj.department === objectiveFilters.department);
    }

    if (objectiveFilters.created_by !== 'all') {
      filtered = filtered.filter(obj => obj.created_by === objectiveFilters.created_by);
    }

    if (objectiveFilters.priority !== 'all') {
      filtered = filtered.filter(obj => obj.priority === objectiveFilters.priority);
    }

    // Search filter
    if (objectiveFilters.search) {
      const query = objectiveFilters.search.toLowerCase();
      filtered = filtered.filter(obj =>
        obj.title.toLowerCase().includes(query) ||
        (obj.description || '').toLowerCase().includes(query) ||
        (obj.department || '').toLowerCase().includes(query)
      );
    }

    // Sort
    switch (objectiveFilters.sortBy) {
      case 'deadline':
        filtered.sort((a, b) => {
          const aDate = a.deadline ? new Date(a.deadline).getTime() : 0;
          const bDate = b.deadline ? new Date(b.deadline).getTime() : 0;
          return aDate - bDate;
        });
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        });
        break;
      case 'status':
        filtered.sort((a, b) => {
          const aStatus = a.status || '';
          const bStatus = b.status || '';
          return aStatus.localeCompare(bStatus);
        });
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const aDate = a.updated_at || a.created_at || '';
          const bDate = b.updated_at || b.created_at || '';
          return bDate.localeCompare(aDate);
        });
        break;
      case 'created_at':
        filtered.sort((a, b) => {
          const aDate = a.created_at || '';
          const bDate = b.created_at || '';
          return bDate.localeCompare(aDate);
        });
        break;
    }

    return filtered;
  }, [objectives, objectiveFilters]);

  // Get unique values for filter dropdowns
  const departments = useMemo(() => {
    const depts = new Set<string>();
    objectives.forEach(obj => {
      if (obj.department) depts.add(obj.department);
    });
    return Array.from(depts).sort();
  }, [objectives]);

  const objectiveTitles = useMemo(() => {
    return objectives.map(obj => ({ id: obj.id, title: obj.title }));
  }, [objectives]);

  // Group filtered tasks by objective
  const tasksByObjective = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const standalone: Task[] = [];

    filteredTasks.forEach(task => {
      if (task.objective_id && task.objectives?.title) {
        const key = task.objective_id;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(task);
      } else {
        standalone.push(task);
      }
    });

    return { grouped, standalone };
  }, [filteredTasks]);

  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedObjectiveId(null);
  };

  const handleCloseObjectiveForm = () => {
    setShowObjectiveForm(false);
    setEditingObjective(null);
  };

  const handleViewObjectiveTasks = (objectiveId: string) => {
    // This is handled by the ObjectiveList component's expand/collapse
    // No action needed here
  };

  const employeesForDropdown: EmployeeReference[] = allEmployees
    .filter(emp => emp.is_active)
    .map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      department: emp.department
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading || employeesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-leanchem-navy text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-leanchem-navy">📋 Task Management</h1>
          <div className="flex gap-3">
            {activeTab === 'objectives' ? (
              <button
                onClick={handleCreateObjective}
                className="bg-leanchem-navy hover:bg-leanchem-navy/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-md hover:shadow-lg"
              >
                <span className="text-xl font-bold">+</span> Create Objective
              </button>
            ) : (
              <button
                onClick={() => handleCreateTask()}
                className="bg-leanchem-blue hover:bg-leanchem-blue/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-md hover:shadow-lg"
              >
                <span className="text-xl font-bold">+</span> Create Task
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 text-xl font-bold">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('objectives')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'objectives'
                    ? 'border-leanchem-blue text-leanchem-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Objectives
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-leanchem-blue text-leanchem-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Tasks
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        {activeTab === 'objectives' ? (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search objectives..."
                  value={objectiveFilters.search}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={objectiveFilters.status}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={objectiveFilters.department}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={objectiveFilters.priority}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <select
                  value={objectiveFilters.created_by}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, created_by: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Creators</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={objectiveFilters.sortBy}
                  onChange={(e) => setObjectiveFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="deadline">Deadline</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="recent">Recently Updated</option>
                  <option value="created_at">Recently Created</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskFilters.search}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={taskFilters.status}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={taskFilters.priority}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <select
                  value={taskFilters.assigned_to}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Assignees</option>
                  {allEmployees.filter(emp => emp.is_active).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                <select
                  value={taskFilters.objective}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, objective: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Objectives</option>
                  {objectiveTitles.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <select
                  value={taskFilters.created_by}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, created_by: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="all">All Creators</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={taskFilters.sortBy}
                  onChange={(e) => setTaskFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
                >
                  <option value="due_date">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="recent">Recently Updated</option>
                  <option value="created_at">Recently Created</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'objectives' ? (
          <ObjectiveList
            isAdmin={true}
            objectives={filteredObjectives}
            onEditObjective={handleEditObjective}
            onDeleteObjective={handleDeleteObjective}
            onViewTasks={handleViewObjectiveTasks}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <div className="space-y-6">
            {/* Tasks grouped by objective */}
            {Object.entries(tasksByObjective.grouped).map(([objectiveId, objectiveTasks]) => {
              const objective = objectives.find(obj => obj.id === objectiveId);
              return (
                <div key={objectiveId} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-leanchem-blue">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-leanchem-navy">
                      {objective?.title || 'Unknown Objective'}
                    </h3>
                    <span className="text-sm text-gray-500">{objectiveTasks.length} task(s)</span>
                  </div>
                  <TaskList
                    tasks={objectiveTasks}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    isAdmin={true}
                  />
                </div>
              );
            })}

            {/* Standalone tasks (no objective) */}
            {tasksByObjective.standalone.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-400">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-700">No Objective</h3>
                  <span className="text-sm text-gray-500">{tasksByObjective.standalone.length} task(s)</span>
                </div>
                <TaskList
                  tasks={tasksByObjective.standalone}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  isAdmin={true}
                />
              </div>
            )}

            {/* Empty state */}
            {filteredTasks.length === 0 && tasks.length > 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 mb-4">No tasks match the current filters. Try adjusting your filters.</p>
                <button
                  onClick={() => setTaskFilters({
                    status: 'all',
                    priority: 'all',
                    assigned_to: 'all',
                    objective: 'all',
                    created_by: 'all',
                    sortBy: 'due_date',
                    search: ''
                  })}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors mx-auto"
                >
                  Clear Filters
                </button>
              </div>
            )}
            {tasks.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 mb-4">No tasks found. Create a new task to get started.</p>
                <button
                  onClick={() => handleCreateTask()}
                  className="bg-leanchem-blue hover:bg-leanchem-blue/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors mx-auto"
                >
                  <span className="text-xl font-bold">+</span> Create Task
                </button>
              </div>
            )}
          </div>
        )}

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <TaskForm
                task={editingTask}
                objectiveId={selectedObjectiveId}
                onSave={handleSaveTask}
                onCancel={handleCloseTaskForm}
                availableEmployees={employeesForDropdown}
              />
            </div>
          </div>
        )}

        {/* Objective Form Modal */}
        {showObjectiveForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <ObjectiveForm
                objective={editingObjective}
                onSave={handleSaveObjective}
                onCancel={handleCloseObjectiveForm}
              />
            </div>
        </div>
      )}
        </div>
    </div>
  );
};

export default TaskManagement;
