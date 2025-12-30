import React from 'react';
import { Task } from '../../types';
import { Button } from '../Common/UI/Button';
import './TaskDetailDrawer.css';

interface TaskDetailDrawerProps {
  task: Task;
  onClose: () => void;
  onStatusChange: (status: Task['status']) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  onClose,
  onStatusChange,
}) => {
  const description = task.description || 'No description';
  const objectiveTitle = task.objectives?.title || 'No linked objective';
  const sanitizeName = (value?: string | null) => {
    if (!value) return '';
    const cleaned = value.replace(/^[^A-Za-z]*[0-9]+[\s\-\|:_]+/, '').trim();
    return cleaned || value;
  };

  const assignedTo =
    (typeof task.assigned_to_name === 'string'
      ? sanitizeName(task.assigned_to_name)
      : typeof task.assigned_to === 'string'
        ? sanitizeName(task.assigned_to)
        : 'Unassigned');

  const handleStatusClick = (status: Task['status']) => {
    if (task.status === status) return;
    onStatusChange(status);
  };

  return (
    <div className="task-drawer-overlay">
      <aside className="task-drawer">
        <header className="task-drawer-header">
          <div>
            <p className="drawer-eyebrow">Task Detail</p>
            <h2>{description}</h2>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </header>

        <section className="task-drawer-section">
          <h3>Overview</h3>
          <div className="task-info-grid">
            <div>
              <p className="label">Status</p>
              <span className={`status-pill status-${task.status}`}>{task.status.replace('_', ' ')}</span>
            </div>
            <div>
              <p className="label">Priority</p>
              <span className={`priority-pill priority-${task.priority || 'low'}`}>
                {(task.priority || 'low').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="label">Assignee</p>
              <span>{assignedTo || 'Unassigned'}</span>
            </div>
            <div>
              <p className="label">Due Date</p>
              <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
            </div>
          </div>
        </section>

        {task.objectives && (
          <section className="task-drawer-section">
            <h3>Objective</h3>
            <div className="objective-meta-grid">
              <div>
                <p className="label">Linked Objective</p>
                <span>{objectiveTitle}</span>
              </div>
              {task.objectives.priority && (
                <div>
                  <p className="label">Objective Priority</p>
                  <span>{task.objectives.priority}</span>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="task-drawer-section">
          <h3>Description</h3>
          <p>{description}</p>
        </section>

        {/* Removed AI strategic analysis and tags sections */}

        <section className="task-drawer-section">
          <h3>Quick Actions</h3>
          <div className="drawer-actions">
            <Button variant="secondary" onClick={() => handleStatusClick('in_progress')}>
              Mark In Progress
            </Button>
            <Button variant="success" onClick={() => handleStatusClick('completed')}>
              Mark Completed
            </Button>
            <Button variant="danger" onClick={() => handleStatusClick('cancelled')}>
              Cancel Task
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
};

export default TaskDetailDrawer;

