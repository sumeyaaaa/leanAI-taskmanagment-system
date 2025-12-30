import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../../types';
import { Button } from '../Common/UI/Button';

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  isAdmin?: boolean;
}

const statusLabels: Record<Task['status'], string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const statusOptions: Task['status'][] = [
  'not_started',
  'in_progress',
  'completed',
  'cancelled'
];

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  isAdmin = false
}) => {
  const navigate = useNavigate();
  
  const handleTaskClick = (task: Task) => {
    if (isAdmin) {
      navigate(`/admin/task-management/${task.id}`);
    } else {
      navigate(`/employee/task-management/${task.id}`);
    }
  };
  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">No tasks found. Try adjusting your filters or create a new task.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-leanchem-navy">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Objective</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Assignee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div 
                      className="text-sm font-medium text-leanchem-navy cursor-pointer hover:text-leanchem-blue hover:underline"
                      onClick={() => handleTaskClick(task)}
                      title="Click to view task details"
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-500 mt-1">{task.description.substring(0, 50)}...</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.objectives?.title || 'Standalone'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusColors[task.status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority] || 'bg-gray-100 text-gray-800'}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.assigned_to_name || task.assigned_to || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="text-leanchem-blue hover:text-leanchem-navy"
                      title="View details"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => onEditTask(task)}
                      className="text-leanchem-blue hover:text-leanchem-navy"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;

