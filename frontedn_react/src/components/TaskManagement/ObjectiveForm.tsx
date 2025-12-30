import React, { useState, useEffect } from 'react';
import { Objective } from '../../types';
import { Button } from '../Common/UI/Button';

interface ObjectiveFormProps {
  objective: Objective | null;
  onSave: (objectiveData: Partial<Objective>) => void;
  onCancel: () => void;
}

type FormState = {
  title: string;
  description: string;
  department: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
};

const createInitialState = (): FormState => ({
  title: '',
  description: '',
  department: '',
  deadline: '',
  priority: 'medium',
  status: 'draft'
});

export const ObjectiveForm: React.FC<ObjectiveFormProps> = ({ objective, onSave, onCancel }) => {
  const [formState, setFormState] = useState<FormState>(createInitialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (objective) {
      setFormState({
        title: objective.title || '',
        description: objective.description || '',
        department: objective.department || '',
        deadline: objective.deadline || '',
        priority: objective.priority || 'medium',
        status: objective.status || 'draft'
      });
    } else {
      setFormState(createInitialState());
    }
  }, [objective]);

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
        deadline: formState.deadline || undefined
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full" onSubmit={handleSubmit}>
      <h3 className="text-2xl font-bold text-leanchem-navy mb-6">
        {objective ? 'Edit Objective' : 'Create New Objective'}
      </h3>

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
          <label htmlFor="department" className="block text-sm font-medium text-leanchem-dark mb-2">
            Department
          </label>
          <input
            id="department"
            name="department"
            type="text"
            value={formState.department}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-leanchem-dark mb-2">
            Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            value={formState.deadline}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leanchem-blue focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
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
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
          {submitting ? 'Saving...' : (objective ? 'Update Objective' : 'Create Objective')}
        </Button>
      </div>
    </form>
  );
};

export default ObjectiveForm;

