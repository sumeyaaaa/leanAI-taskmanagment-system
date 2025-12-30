import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { taskService } from '../../services/task';
import { employeeService } from '../../services/employee';
import { Task, TaskAttachment, TaskNote, EmployeeReference } from '../../types';
import { Employee } from '../../types/employee';
import { Button } from '../../components/Common/UI/Button';
import { useAuth } from '../../contexts/AuthContext';
import { formatObjectiveNumber } from '../../utils/helpers';
import './TaskDetailPage.css';

const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteProgress, setNoteProgress] = useState<number>(0);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeReference[]>([]);
  const [availableEmployeesLoading, setAvailableEmployeesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'notes'>('details');
  const [showNotificationMessage, setShowNotificationMessage] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const { user } = useAuth();

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setError('Task ID missing');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await taskService.getTaskById(taskId);
      // Backend returns { success: true, task: {...} }
      // getTaskById returns response.data, so we need to check response.data.task
      const nextTask = (response as any)?.task || response;
      setTask(nextTask);
      setNoteProgress(nextTask?.completion_percentage ?? 0);
      
      // Set default recipients
      const defaults = new Set<string>();
      if (typeof nextTask?.assigned_to === 'string' && nextTask.assigned_to) {
        defaults.add(nextTask.assigned_to);
      }
      (nextTask?.assigned_to_multiple || []).forEach((empId: string) => {
        if (typeof empId === 'string' && empId) {
          defaults.add(empId);
        }
      });
      setSelectedRecipients(Array.from(defaults));
    } catch (err) {
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadNotes = useCallback(async () => {
    if (!taskId) return;
    const data = await taskService.getTaskNotes(taskId);
    setNotes(data);
  }, [taskId]);

  const loadAttachments = useCallback(async () => {
    if (!taskId) return;
    const data = await taskService.getTaskAttachments(taskId);
    setAttachments(data);
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    loadNotes();
    loadAttachments();
  }, [loadNotes, loadAttachments]);

  useEffect(() => {
    // Load employees for assignment dropdown if needed
    if (isEditing) {
      loadEmployees();
    }
  }, [isEditing]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await employeeService.getAllEmployees(true);
      let employeesList: Employee[] = [];
      if (Array.isArray(data)) {
        employeesList = data;
      } else if (data && typeof data === 'object' && 'employees' in data) {
        employeesList = Array.isArray((data as any).employees) ? (data as any).employees : [];
      } else if (data && typeof data === 'object' && 'data' in data) {
        employeesList = Array.isArray((data as any).data) ? (data as any).data : [];
      }
      setEmployees(employeesList.filter(emp => emp.is_active !== false));
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    }
  }, []);

  // Check if navigated from notification
  useEffect(() => {
    const taskIdFromNotification = localStorage.getItem('current_task_id');
    if (taskIdFromNotification === taskId) {
      // Clear the flag
      localStorage.removeItem('current_task_id');
      // Show notification message
      setNotificationMessage('You were redirected here from a notification');
      setShowNotificationMessage(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowNotificationMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [taskId]);

  useEffect(() => {
    let isMounted = true;
    const fetchAvailableEmployees = async () => {
      if (!taskId) {
        setAvailableEmployees([]);
        return;
      }
      try {
        setAvailableEmployeesLoading(true);
        const response = await taskService.getAvailableEmployeesForAttachment(taskId);
        if (!isMounted) return;
        if (response.success) {
          setAvailableEmployees(response.employees ?? []);
        } else {
          setAvailableEmployees([]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading employees for note notifications', err);
          setAvailableEmployees([]);
        }
      } finally {
        if (isMounted) {
          setAvailableEmployeesLoading(false);
        }
      }
    };
    fetchAvailableEmployees();
    return () => {
      isMounted = false;
    };
  }, [taskId]);

  const handleAttachmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !taskId) {
      setUploadError('Please choose a file to upload');
      return;
    }
    try {
      setUploading(true);
      setUploadError('');
      setUploadMessage('');
      console.log(`📤 Starting upload for task ${taskId}, file: ${selectedFile.name}`);
      const result = await taskService.uploadTaskAttachment(taskId, selectedFile);
      console.log(`📤 Upload result:`, result);
      if (result.success) {
        setUploadMessage('Attachment uploaded successfully.');
        setSelectedFile(null);
        // Wait a bit before reloading to ensure backend has processed
        setTimeout(async () => {
          await loadAttachments();
        }, 500);
      } else {
        setUploadError(result.error || 'Failed to upload attachment');
      }
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      setUploadError(err?.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleAddNote = async () => {
    if (!taskId || !noteText.trim()) return;
    try {
      setSubmittingNote(true);
      const notifyIds = selectedRecipients.filter(id => id && id !== '__none__');
      const [attached_to, ...rest] = notifyIds;
      await taskService.addTaskNote(taskId, { 
        notes: noteText.trim(), 
        progress: noteProgress,
        attached_to,
        attached_to_multiple: rest.length ? rest : undefined
      });
      setNoteText('');
      setSelectedRecipients([]);
      await Promise.all([loadNotes(), loadTask()]);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusChange = async (status: Task['status']) => {
    if (!taskId) return;
    try {
      await taskService.updateTaskStatus(taskId, status);
      await loadTask();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Check if employee can edit this task (created_by == assigned_to == current user)
  const canEdit = useMemo(() => {
    if (!task || !user) {
      return false;
    }
    
    // Get current user ID - check multiple sources
    let currentUserId: string | null = null;
    
    // First try user object
    if ((user as any).employee_id) {
      currentUserId = (user as any).employee_id;
    } else if (user.id) {
      currentUserId = user.id;
    }
    
    // If still not found, check localStorage
    if (!currentUserId) {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          currentUserId = parsed.employee_id || parsed.id || null;
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    if (!currentUserId) {
      return false;
    }
    
    // Normalize IDs to strings for comparison (trim whitespace, lowercase for UUID comparison)
    const taskCreatedBy = task.created_by ? String(task.created_by).trim().toLowerCase() : null;
    const taskAssignedTo = task.assigned_to ? String(task.assigned_to).trim().toLowerCase() : null;
    const normalizedCurrentUserId = String(currentUserId).trim().toLowerCase();
    
    // Employee can edit if they created the task AND:
    // - It's assigned to them, OR
    // - It's unassigned (they can assign it to themselves)
    // AND it's not admin-created
    const createdByMatch = taskCreatedBy === normalizedCurrentUserId;
    const isAssignedToUser = taskAssignedTo === normalizedCurrentUserId;
    const isUnassigned = !taskAssignedTo;
    const assignedToMatch = isAssignedToUser || isUnassigned;
    
    return (
      createdByMatch &&
      assignedToMatch &&
      !task.is_admin_created
    );
  }, [task, user]);

  const handleEdit = () => {
    if (!task || !user) return;
    // Get current user ID
    const currentUserId = (user as any).employee_id || user.id;
    setEditData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
      completion_percentage: task.completion_percentage,
      // Always set assigned_to to current user (employees can only create tasks for themselves)
      assigned_to: currentUserId
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!taskId || !task || !user) return;
    try {
      setSaving(true);
      // Get current user ID
      const currentUserId = (user as any).employee_id || user.id;
      
      // Prepare save data - employees can only edit certain fields
      const saveData: any = {
        title: editData.title,
        description: editData.description,
        priority: editData.priority,
        due_date: editData.due_date,
        completion_percentage: editData.completion_percentage,
        // Always set assigned_to to current user (employees can only create tasks for themselves)
        assigned_to: currentUserId
      };
      
      // Remove undefined/null fields
      Object.keys(saveData).forEach(key => {
        if (saveData[key] === undefined || saveData[key] === null) {
          delete saveData[key];
        }
      });
      
      console.log('💾 Saving task data:', saveData);
      const result = await taskService.updateTask(taskId, saveData);
      console.log('💾 Save result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save task');
      }
      
      setIsEditing(false);
      setEditData({});
      await loadTask();
    } catch (err: any) {
      console.error('Failed to save task:', err);
      alert(`Failed to save task: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString();
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toLocaleString();
  };

  const recipientNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableEmployees.forEach((emp) => {
      if (!emp?.id) return;
      const displayName = emp.name || emp.email || emp.id;
      map[emp.id] = displayName;
    });
    return map;
  }, [availableEmployees]);

  const getNoteRecipientNames = (note: TaskNote) => {
    // Simplified - removed old attachment fields
    return [];
  };

  // Removed strategic_metadata section
  const metadataFields: Array<{ label: string; value: string | undefined }> = [];

  const statusShortcuts: Task['status'][] = ['in_progress', 'completed', 'cancelled'];

  if (loading) {
    return <div className="loading">Loading task details...</div>;
  }

  if (error || !task) {
    return (
      <div className="error-container">
        <p>{error || 'Task not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/employee/task-management')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      {showNotificationMessage && (
        <div className="notification-banner" style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#1976d2' }}>🔔 {notificationMessage}</span>
          <button
            onClick={() => setShowNotificationMessage(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#1976d2',
              padding: '0 8px'
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="task-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button variant="ghost" onClick={() => navigate('/employee/task-management')}>
            ← Back to Tasks
          </Button>
          <h1>{isEditing ? (editData.title ?? task.title) : (task.title || task.description || 'Task Details')}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canEdit && !isEditing && (
            <Button variant="primary" onClick={handleEdit}>
              ✏️ Edit Task
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        {(['details', 'attachments', 'notes'] as const).map(tab => (
          <button 
            key={tab}
            className={`detail-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'details' && 'Details'}
            {tab === 'attachments' && '📎 Task Update'}
            {tab === 'notes' && 'Notes'}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="detail-section">
          <div className="detail-overview-grid">
            <div>
              <p className="label">Title</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.title ?? task.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              ) : (
                <strong>{task.title || 'Untitled'}</strong>
              )}
            </div>
            <div>
              <p className="label">Priority</p>
              {isEditing ? (
                <select
                  value={editData.priority || task.priority || 'medium'}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' 
                  })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <span className={`priority-badge ${task.priority || 'low'}`}>
                  {(task.priority || 'low').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="label">Due date</p>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.due_date ? editData.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              ) : (
                <strong>{formatDate(task.due_date)}</strong>
              )}
            </div>
            <div>
              <p className="label">Objective</p>
              <strong>{task.objectives?.title || '—'}</strong>
            </div>
            <div>
              <p className="label">Objective Priority</p>
              <strong>{task.objectives?.priority || '—'}</strong>
            </div>
            <div>
              <p className="label">Progress</p>
              {isEditing ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editData.completion_percentage ?? task.completion_percentage ?? 0}
                  onChange={(e) => setEditData({ ...editData, completion_percentage: Number(e.target.value) })}
                  style={{ width: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              ) : (
                <strong>{task.completion_percentage ?? 0}%</strong>
              )}
            </div>
            <div>
              <p className="label">Assignee</p>
              <strong>
                {task.assigned_to_name ||
                  (typeof task.assigned_to === 'string' ? task.assigned_to : 'Unassigned')}
                {isEditing && (
                  <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                    (You - cannot change)
                  </span>
                )}
              </strong>
            </div>
          </div>

          <div className="detail-objective-card">
            <p className="label">Description</p>
            {isEditing ? (
              <textarea
                value={editData.description ?? task.description ?? ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={6}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
              />
            ) : (
              <p>{task.description || 'No description provided.'}</p>
            )}
          </div>

          {/* Last edited information */}
          {task.updated_at && task.updated_at !== task.created_at && (
            <div className="detail-meta-info" style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#666'
            }}>
              <span style={{ fontWeight: 'bold' }}>✏️ Last edited at: </span>
              <span>{formatDateTime(task.updated_at)}</span>
            </div>
          )}

          {metadataFields.length > 0 && (
            <div className="strategic-analysis-card">
              <h4>AI Strategic Analysis</h4>
              <div className="strategic-meta">
                {metadataFields.map(field => (
                  <div key={field.label}>
                    <p className="label">{field.label}</p>
                    <p>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions">
            {statusShortcuts.map(status => (
              <Button
                key={status}
                variant={task.status === status ? 'success' : 'secondary'}
                size="small"
                onClick={() => handleStatusChange(status)}
                disabled={task.status === status}
              >
                {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="detail-section">
          <div className="section-header">
            <div>
              <h4>Attachments</h4>
              <p className="muted-text">Files shared for this task.</p>
            </div>
            <Button variant="ghost" size="small" onClick={loadAttachments}>
              Refresh
            </Button>
          </div>

          {attachments.length === 0 ? (
            <p className="muted-text">No attachments uploaded yet.</p>
          ) : (
            <ul className="attachment-list">
              {attachments.map((attachment, idx) => (
                <li key={`${attachment.update_id}-${idx}`} className="attachment-item">
                  <div>
                    <strong>{attachment.filename || 'Attachment'}</strong>
                    <p>{attachment.file_type || 'File'}</p>
                  </div>
                  <div>
                    <p className="label">Uploaded</p>
                    <span>{formatDate(attachment.created_at)}</span>
                  </div>
                  {attachment.public_url && (
                    <a
                      href={attachment.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link-button"
                    >
                      Open
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="attachment-upload" onSubmit={handleAttachmentSubmit}>
            <label>
              Upload new file
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </form>
          {uploadError && <p className="error-text">{uploadError}</p>}
          {uploadMessage && <p className="success-text">{uploadMessage}</p>}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="detail-section">
          <div className="section-header">
            <div>
              <h4>Notes & Updates</h4>
              <p className="muted-text">Track conversations and progress updates.</p>
            </div>
            <Button variant="ghost" size="small" onClick={loadNotes}>
              Refresh
            </Button>
          </div>

          {notes.length === 0 ? (
            <p className="muted-text">No notes yet. Add the first update below.</p>
          ) : (
            <div className="notes-list">
              {notes.map(note => {
                const recipientNames = getNoteRecipientNames(note);
                return (
                  <div key={note.id} className="note-card">
                    <div className="note-card-header">
                      <div>
                        <strong>{note.updated_by_name || note.employee_name || 'Unknown'}</strong>
                        <span>Team member</span>
                      </div>
                      <span>{formatDateTime(note.created_at)}</span>
                    </div>
                    <p>{note.notes}</p>
                    <div className="note-card-meta">
                      <span>Progress: {note.progress ?? 0}%</span>
                    </div>
                    {recipientNames.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
                        <span>👥 Notified: {recipientNames.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <form className="note-form" onSubmit={(e) => { e.preventDefault(); handleAddNote(); }}>
            <label>
              Add note
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Summarize updates, blockers, or decisions..."
              />
            </label>
            <label className="range-label">
              Progress ({noteProgress}%)
              <input
                type="range"
                min={0}
                max={100}
                value={noteProgress}
                onChange={(e) => setNoteProgress(Number(e.target.value))}
              />
            </label>
            <label>
              Notify teammates (optional)
              {availableEmployeesLoading && <p className="muted-text">Loading employees...</p>}
              <p className="muted-text" style={{ fontSize: '12px', marginBottom: '8px' }}>
                Select teammates who should receive a notification about this update.
              </p>
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                padding: '8px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: '#fff',
                opacity: availableEmployeesLoading ? 0.6 : 1
              }}>
                {availableEmployees
                  .filter(emp => emp?.id)
                  .map((emp) => {
                    const empId = emp.id!;
                    const isSelected = selectedRecipients.includes(empId);
                    return (
                      <label
                        key={empId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 8px',
                          cursor: availableEmployeesLoading ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                          transition: 'background-color 0.2s',
                          pointerEvents: availableEmployeesLoading ? 'none' : 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !availableEmployeesLoading) e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={availableEmployeesLoading}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedRecipients(prev => prev.filter(id => id !== empId));
                            } else {
                              setSelectedRecipients(prev => [...prev.filter(id => id !== '__none__'), empId]);
                            }
                          }}
                          style={{ marginRight: '8px', cursor: availableEmployeesLoading ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ flex: 1 }}>
                          {emp.name || emp.email || 'Unknown'}
                          {emp.role && <span style={{ color: '#666', marginLeft: '4px' }}>({emp.role})</span>}
                          {emp.department && <span style={{ color: '#999', marginLeft: '4px' }}>· {emp.department}</span>}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </label>
            {selectedRecipients.length > 0 && (
              <p className="muted-text" style={{ marginTop: '8px' }}>
                Notifying: {selectedRecipients.filter(id => id !== '__none__').map(id => recipientNameMap[id] || id).join(', ')}
              </p>
            )}
            <div className="note-form-actions">
              <Button type="submit" variant="primary" disabled={!noteText.trim() || submittingNote}>
                {submittingNote ? 'Posting…' : 'Post note'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskDetailPage;

