import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskFilter, Objective } from '../../types';
import { taskService } from '../../services/task';
import { TaskList } from './TaskList';
import { TaskForm } from './TaskForm';
import { ObjectiveList } from './ObjectiveList';
import { ObjectiveForm } from './ObjectiveForm';
import { TaskFilters } from './TaskFilters';
import { Button } from '../Common/UI/Button';
import { TaskManagementFilters } from './types';

const defaultFilters: TaskManagementFilters = {
  status: 'all',
  priority: 'all',
  assigned_to: 'all',
  search: ''
};

export const TaskManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'objectives' | 'tasks'>('objectives');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showObjectiveForm, setShowObjectiveForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskManagementFilters>(defaultFilters);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadTasks();
    } else {
      loadObjectives();
    }
  }, [filters.status, filters.priority, filters.assigned_to, activeTab]);

  const stripIdPrefix = (value: string) => {
    return value.replace(/^[^A-Za-z]*[0-9]+[\s\-\|:_]+/, '').trim();
  };

  const displayedTasks = useMemo(() => {
    if (!filters.search) return tasks;
    const query = filters.search.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description || '').toLowerCase().includes(query) ||
      stripIdPrefix(task.assigned_to_name || '').toLowerCase().includes(query) ||
      stripIdPrefix(task.assigned_to || '').toLowerCase().includes(query)
    );
  }, [tasks, filters.search]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const apiFilters: TaskFilter = {};
      if (filters.status !== 'all') {
        apiFilters.status = filters.status;
      }
      if (filters.priority !== 'all') {
        apiFilters.priority = filters.priority;
      }
      if (filters.assigned_to !== 'all') {
        apiFilters.assigned_to = filters.assigned_to;
      }
      if (selectedObjectiveId) {
        apiFilters.objective_id = selectedObjectiveId;
      }

      const data = await taskService.getTasks(apiFilters);
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
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

  const handleCreateTask = (objectiveId?: string) => {
    setEditingTask(null);
    setSelectedObjectiveId(objectiveId || null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleCreateObjective = () => {
    setEditingObjective(null);
    setShowObjectiveForm(true);
  };

  const handleEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setShowObjectiveForm(true);
  };

  const handleViewObjectiveTasks = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setActiveTab('tasks');
    loadTasks();
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
          const result = await taskService.createTask(taskData);
          if (!result.success) {
            throw new Error(result.error || 'Failed to create task');
          }
      }

      setShowTaskForm(false);
      setEditingTask(null);
      setSelectedObjectiveId(null);
      await loadTasks();
      if (activeTab === 'objectives') {
        await loadObjectives();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error ${editingTask ? 'updating' : 'creating'} task: ${message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const result = await taskService.deleteTask(taskId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete task');
        }
        await loadTasks();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error deleting task: ${message}`);
      }
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const result = await taskService.updateTaskStatus(taskId, newStatus);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task status');
      }
      await loadTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error updating task status: ${message}`);
    }
  };

  const handleFiltersChange = (updatedFilters: Partial<TaskManagementFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updatedFilters
    }));
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Error deleting objective: ${message}`);
      }
    }
  };

  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedObjectiveId(null);
  };

  const handleCloseObjectiveForm = () => {
    setShowObjectiveForm(false);
    setEditingObjective(null);
  };

  if (loading) {
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
                className="bg-leanchem-navy hover:bg-leanchem-navy/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">+</span> Create Objective
              </button>
            ) : (
              <button
                onClick={() => handleCreateTask()}
                className="bg-leanchem-blue hover:bg-leanchem-blue/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">+</span> Create Task
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
                Tasks
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'objectives' ? (
          <ObjectiveList
            objectives={objectives}
            onEditObjective={handleEditObjective}
            onDeleteObjective={handleDeleteObjective}
            onViewTasks={handleViewObjectiveTasks}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        ) : (
          <>
            {selectedObjectiveId && (
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-leanchem-blue rounded">
                <button
                  onClick={() => {
                    setSelectedObjectiveId(null);
                    loadTasks();
                  }}
                  className="text-leanchem-navy hover:underline"
                >
                  ← Back to all tasks
                </button>
              </div>
            )}
            <TaskFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              tasks={tasks}
            />
            <TaskList
              tasks={displayedTasks}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          </>
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