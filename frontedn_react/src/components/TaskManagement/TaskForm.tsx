import React, { useState, useEffect } from 'react';
import { Task, EmployeeReference } from '../../types';
import { Button } from '../Common/UI/Button';
import { employeeService } from '../../services/employee';
import { Employee } from '../../types/employee';

interface TaskFormProps {
  task: Task | null;
  objectiveId?: string | null;
  onSave: (taskData: Partial<Task>) => void;
  onCancel: () => void;
  availableEmployees?: EmployeeReference[]; // Optional prop to pass employees from parent
}

type FormState = {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  assigned_to: string;
  due_date: string;
};

const createInitialState = (): FormState => ({
  title: '',
  description: '',
  status: 'not_started',
  priority: 'medium',
  assigned_to: '',
  due_date: ''
});

export const TaskForm: React.FC<TaskFormProps> = ({ task, objectiveId, onSave, onCancel, availableEmployees }) => {
  const [formState, setFormState] = useState<FormState>(createInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (task) {
      setFormState({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : ''
      });
    } else {
      setFormState(createInitialState());
    }
  }, [task]);

  useEffect(() => {
    // If availableEmployees prop is provided, use it; otherwise load from API
    if (availableEmployees && availableEmployees.length > 0) {
      setEmployees(availableEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role || 'employee',
        department: emp.department,
        is_active: true
      } as Employee)));
      setLoadingEmployees(false);
    } else {
      const loadEmployees = async () => {
        try {
          setLoadingEmployees(true);
          const data = await employeeService.getAllEmployees(true);
          setEmployees(Array.isArray(data) ? data.filter(emp => emp.is_active !== false) : []);
        } catch (err) {
          console.error('Failed to load employees:', err);
          setEmployees([]);
        } finally {
          setLoadingEmployees(false);
        }
      };
      loadEmployees();
    }
  }, [availableEmployees]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formState.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formState,
        due_date: formState.due_date ? new Date(formState.due_date).toISOString() : undefined,
        objective_id: objectiveId || task?.objective_id
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full" onSubmit={handleSubmit}>
      <h3 className="text-2xl font-bold text-leanchem-navy mb-6">{task ? 'Edit Task' : 'Create New Task'}</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-leanchem-dark mb-2">
          Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formState.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-leanchem-dark mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formState.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-leanchem-dark mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formState.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-leanchem-dark mb-2">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formState.priority}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="assigned_to" className="block text-sm font-medium text-leanchem-dark mb-2">
            Assign to Employee
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            value={formState.assigned_to}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          >
            <option value="">Select Employee...</option>
            {loadingEmployees ? (
              <option value="" disabled>Loading employees...</option>
            ) : (
              employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.role ? `(${emp.role})` : ''} {emp.department ? `- ${emp.department}` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-leanchem-dark mb-2">
            Due Date
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            value={formState.due_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="px-6 py-2 bg-leanchem-navy text-white rounded-lg hover:bg-leanchem-navy/90"
        >
          {submitting ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;

