import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Objective, Task } from '../../types';
import { Button } from '../Common/UI/Button';
import { taskService } from '../../services/task';

interface ObjectiveListProps {
  objectives: Objective[];
  onEditObjective: (objective: Objective) => void;
  onDeleteObjective: (objectiveId: string) => void;
  onViewTasks: (objectiveId: string) => void;
  onCreateTask: (objectiveId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  refreshTrigger?: number; // Add refresh trigger to force reload tasks
  isAdmin?: boolean; // Add isAdmin prop to determine navigation path
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export const ObjectiveList: React.FC<ObjectiveListProps> = ({
  objectives,
  onEditObjective,
  onDeleteObjective,
  onViewTasks,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  refreshTrigger,
  isAdmin = false
}) => {
  const navigate = useNavigate();
  const [objectiveTasks, setObjectiveTasks] = useState<Record<string, Task[]>>({});
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});
  
  const handleTaskClick = (task: Task) => {
    if (isAdmin) {
      navigate(`/admin/task-management/${task.id}`);
    } else {
      navigate(`/employee/task-management/${task.id}`);
    }
  };

  useEffect(() => {
    // Load tasks for all objectives
    const loadAllTasks = async () => {
      for (const objective of objectives) {
        if (objective.id && !objectiveTasks[objective.id]) {
          await loadTasksForObjective(objective.id);
        }
      }
    };
    loadAllTasks();
  }, [objectives, objectiveTasks]);

  // Refresh tasks when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // Reload tasks for all expanded objectives
      const reloadTasks = async () => {
        const expandedArray = Array.from(expandedObjectives);
        for (const objectiveId of expandedArray) {
          await loadTasksForObjective(objectiveId);
        }
        // Clear cache for all objectives so they reload when expanded
        // This ensures newly created tasks show up even if objective wasn't expanded
        setObjectiveTasks(prev => {
          const newState = { ...prev };
          // Keep tasks for expanded objectives, clear others
          for (const objective of objectives) {
            if (objective.id && !expandedArray.includes(objective.id)) {
              delete newState[objective.id];
            }
          }
          return newState;
        });
      };
      reloadTasks();
    }
  }, [refreshTrigger, expandedObjectives, objectives]);

  const loadTasksForObjective = async (objectiveId: string) => {
    try {
      setLoadingTasks(prev => ({ ...prev, [objectiveId]: true }));
      const tasks = await taskService.getTasks({ objective_id: objectiveId } as any);
      setObjectiveTasks(prev => ({ ...prev, [objectiveId]: tasks }));
    } catch (error) {
      console.error(`Error loading tasks for objective ${objectiveId}:`, error);
      setObjectiveTasks(prev => ({ ...prev, [objectiveId]: [] }));
    } finally {
      setLoadingTasks(prev => ({ ...prev, [objectiveId]: false }));
    }
  };

  // Expose refresh function for parent component
  const refreshObjectiveTasks = (objectiveId: string) => {
    loadTasksForObjective(objectiveId);
  };

  const toggleObjective = (objectiveId: string) => {
    setExpandedObjectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectiveId)) {
        newSet.delete(objectiveId);
      } else {
        newSet.add(objectiveId);
        // Always reload tasks when expanding to ensure we have the latest data
        loadTasksForObjective(objectiveId);
      }
      return newSet;
    });
  };

  if (objectives.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500 mb-4">No objectives found. Create a new objective to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {objectives.map((objective) => {
        const tasks = objectiveTasks[objective.id || ''] || [];
        const isExpanded = expandedObjectives.has(objective.id || '');
        const isLoading = loadingTasks[objective.id || ''];

        return (
          <div
            key={objective.id}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-leanchem-blue"
          >
            {/* Objective Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => objective.id && toggleObjective(objective.id)}
                    className="text-leanchem-navy hover:text-leanchem-blue text-xl font-bold"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <h3 className="text-xl font-semibold text-leanchem-navy">{objective.title}</h3>
                </div>
                {objective.description && (
                  <p className="text-gray-600 mb-3 ml-8">{objective.description}</p>
                )}
                <div className="flex flex-wrap gap-2 items-center ml-8">
                  {objective.status && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      objective.status === 'completed' ? 'bg-green-100 text-green-800' :
                      objective.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      objective.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[objective.status] || objective.status}
                    </span>
                  )}
                  {objective.priority && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[objective.priority] || 'bg-gray-100 text-gray-800'}`}>
                      {objective.priority.charAt(0).toUpperCase() + objective.priority.slice(1)}
                    </span>
                  )}
                  {objective.department && (
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                      {objective.department}
                    </span>
                  )}
                  {objective.deadline && (
                    <span className="text-sm text-gray-500">
                      Due: {new Date(objective.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => objective.id && onCreateTask(objective.id)}
                  className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  title="Add Task"
                >
                  <span className="text-lg font-bold">+</span> Add Task
                </button>
                <button
                  onClick={() => objective.id && onEditObjective(objective)}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => objective.id && onDeleteObjective(objective.id)}
                  className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Tasks Section */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-3">No tasks yet. Click "+ Add Task" to create one.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-leanchem-blue hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                        title="Click to view task details"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-leanchem-navy text-sm hover:text-leanchem-blue hover:underline">{task.title}</h4>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {onEditTask && (
                              <button
                                onClick={() => onEditTask(task)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Edit
                              </button>
                            )}
                            {onDeleteTask && (
                              <button
                                onClick={() => task.id && onDeleteTask(task.id)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 items-center text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status?.replace('_', ' ') || 'Not Started'}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${priorityColors[task.priority || 'medium'] || 'bg-gray-100 text-gray-800'}`}>
                            {task.priority || 'Medium'}
                          </span>
                          {task.assigned_to_name && (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              👤 {task.assigned_to_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Add Task Card */}
                    <div
                      onClick={() => objective.id && onCreateTask(objective.id)}
                      className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-dashed border-green-300 hover:border-green-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-center min-h-[120px]"
                    >
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">+</div>
                        <div className="text-sm font-medium text-green-700">Add Task</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ObjectiveList;

