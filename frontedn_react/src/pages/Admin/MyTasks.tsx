import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../../services/task';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../types';
import { Button } from '../../components/Common/UI/Button';
import { Card } from '../../components/Common/UI/Card';
import '../Employee/TaskManagement.css';

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed' | 'waiting';
type TabType = 'tasks' | 'progress';

const MyTasks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [filters, setFilters] = useState({
    status: 'all' as StatusFilter,
    objective: 'all',
    sortBy: 'due_date' as 'due_date' | 'priority' | 'status' | 'recent',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all tasks and filter to show only tasks assigned to current admin
      const allTasks = await taskService.getTasks();
      const normalized = Array.isArray(allTasks)
        ? allTasks
        : Array.isArray((allTasks as any)?.tasks)
          ? (allTasks as any).tasks
          : [];
      
      // Filter tasks assigned to current admin (user.id is the employee_id)
      const currentUserId = user?.id || (user as any)?.employee_id;
      const myTasks = normalized.filter((task: Task) => {
        // Check if assigned to this admin
        if (task.assigned_to === currentUserId) return true;
        // Check if in assigned_to_multiple array
        if (task.assigned_to_multiple && Array.isArray(task.assigned_to_multiple)) {
          return task.assigned_to_multiple.includes(currentUserId);
        }
        return false;
      });
      
      setTasks(myTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Unable to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const objectives = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(task => {
      if (task.objectives?.title) {
        set.add(task.objectives.title);
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.objective !== 'all') {
      filtered = filtered.filter(task => task.objectives?.title === filters.objective);
    }

    switch (filters.sortBy) {
      case 'due_date':
        filtered.sort((a, b) => {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          return aDate - bDate;
        });
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        });
        break;
      case 'status':
        filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const aDate = a.updated_at || a.created_at || '';
          const bDate = b.updated_at || b.created_at || '';
          return bDate.localeCompare(aDate);
        });
        break;
    }

    return filtered;
  }, [tasks, filters]);

  const formatDate = (value?: string) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString();
  };

  const renderFiltersSection = () => {
    return (
      <div className="filters-section">
        <div className="filter-group">
          <label>
            Status
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as StatusFilter }))}
            >
              <option value="all">All</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="waiting">Waiting</option>
            </select>
          </label>
          <label>
            Objective
            <select
              value={filters.objective}
              onChange={(e) => setFilters(prev => ({ ...prev, objective: e.target.value }))}
            >
              <option value="all">All Objectives</option>
              {objectives.map(obj => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </label>
          <label>
            Sort By
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
            >
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="recent">Recent</option>
            </select>
          </label>
        </div>
      </div>
    );
  };

  const renderTaskCards = () => {
    if (loading) {
      return <div className="loading">Loading tasks...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    if (filteredTasks.length === 0) {
      return (
        <Card className="no-tasks-card">
          <div className="no-tasks">
            <h3>No tasks found</h3>
            <p>You don't have any tasks assigned to you matching the current filter.</p>
            <p className="muted-text">Go to "Task Management" to see all tasks or assign tasks to yourself.</p>
          </div>
        </Card>
      );
    }

    return (
      <div className="task-cards-grid">
        {filteredTasks.map(task => {
          const description = task.title || task.description || 'No description';
          const objectiveTitle = task.objectives?.title || 'No Objective';
          const progress = task.completion_percentage ?? 0;

          return (
            <article
              key={task.id}
              data-task-id={task.id}
              className="task-card"
              onClick={() => navigate(`/admin/task-management/${task.id}`)}
            >
              <div className="task-card-header">
                <div>
                  <p className="task-card-eyebrow">Task</p>
                  <h4>{description}</h4>
                </div>
                <span className={`status-pill ${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <div className="task-card-meta">
                <div>
                  <p className="label">Objective</p>
                  <strong>{objectiveTitle}</strong>
                </div>
                <div>
                  <p className="label">Priority</p>
                  <span className={`priority-badge ${task.priority || 'low'}`}>
                    {(task.priority || 'low').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="label">Due</p>
                  <strong>{formatDate(task.due_date)}</strong>
                </div>
                <div>
                  <p className="label">Progress</p>
                  <strong>{progress}%</strong>
                </div>
              </div>

              <div className="task-card-footer">
                <span>Created: {formatDate(task.created_at)}</span>
                <span>Updated: {formatDate(task.updated_at)}</span>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderProgressTab = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const pendingTasks = tasks.filter(t => t.status === 'not_started').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const recentTasks = [...tasks]
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      .slice(0, 5);

    return (
      <div className="progress-tab">
        <div className="progress-metrics">
          <div className="metric-card">
            <h3>Total Tasks</h3>
            <p className="metric-value">{totalTasks}</p>
          </div>
          <div className="metric-card">
            <h3>Completed</h3>
            <p className="metric-value">{completedTasks}</p>
          </div>
          <div className="metric-card">
            <h3>In Progress</h3>
            <p className="metric-value">{inProgressTasks}</p>
          </div>
          <div className="metric-card">
            <h3>Pending</h3>
            <p className="metric-value">{pendingTasks}</p>
          </div>
        </div>

        <div className="completion-section">
          <h3>Overall Completion: {completionRate.toFixed(1)}%</h3>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="status-breakdown">
          <h3>Task Breakdown by Status</h3>
          <div className="breakdown-bars">
            <div className="breakdown-item">
              <span>Completed</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill completed" style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }} />
              </div>
              <span>{completedTasks}</span>
            </div>
            <div className="breakdown-item">
              <span>In Progress</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill in-progress" style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%` }} />
              </div>
              <span>{inProgressTasks}</span>
            </div>
            <div className="breakdown-item">
              <span>Pending</span>
              <div className="breakdown-bar">
                <div className="breakdown-fill pending" style={{ width: `${totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0}%` }} />
              </div>
              <span>{pendingTasks}</span>
            </div>
          </div>
        </div>

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          {recentTasks.length === 0 ? (
            <p className="muted-text">No recent activity</p>
          ) : (
            <div className="activity-list">
              {recentTasks.map(task => {
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
                return (
                  <div key={task.id} className="activity-item">
                    <span className="activity-icon">{statusIcon}</span>
                    <div className="activity-content">
                      <strong>{task.title || task.description || 'Untitled'}</strong>
                      <span>{task.completion_percentage ?? 0}% - {formatDate(task.updated_at || task.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="employee-task-page">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>My Tasks</h1>
        <p className="muted-text">Tasks assigned to you. Go to "Task Management" to see all tasks in the system.</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          📋 My Tasks
        </button>
        <button
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 My Progress
        </button>
      </div>

      {activeTab === 'tasks' && (
        <>
          {renderFiltersSection()}
          {renderTaskCards()}
        </>
      )}

      {activeTab === 'progress' && renderProgressTab()}
    </div>
  );
};

export default MyTasks;

