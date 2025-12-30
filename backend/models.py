from datetime import datetime
from typing import Optional, List, Dict, Any

class Employee:
    def __init__(self, 
                 name: str,
                 email: str,
                 role: str,
                 skills: List[str] = None,
                 is_active: bool = True,
                 created_at: Optional[str] = None,
                 id: Optional[str] = None):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.skills = skills or []
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'skills': self.skills,
            'is_active': self.is_active,
            'created_at': self.created_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Employee':
        return cls(
            id=data.get('id'),
            name=data['name'],
            email=data['email'],
            role=data['role'],
            skills=data.get('skills', []),
            is_active=data.get('is_active', True),
            created_at=data.get('created_at')
        )

class Objective:
    def __init__(self,
                 title: str,
                 created_by: str,
                 description: Optional[str] = None,
                 department: Optional[str] = None,
                 deadline: Optional[str] = None,
                 priority: str = 'medium',
                 status: str = 'draft',
                 is_admin_created: bool = False,
                 created_at: Optional[str] = None,
                 updated_at: Optional[str] = None,
                 id: Optional[str] = None):
        self.id = id
        self.title = title
        self.description = description
        self.department = department
        self.deadline = deadline
        self.priority = priority
        self.status = status
        self.created_by = created_by
        self.is_admin_created = is_admin_created
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'department': self.department,
            'deadline': self.deadline,
            'priority': self.priority,
            'status': self.status,
            'created_by': self.created_by,
            'is_admin_created': self.is_admin_created,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Objective':
        return cls(
            id=data.get('id'),
            title=data['title'],
            description=data.get('description'),
            department=data.get('department'),
            deadline=data.get('deadline'),
            priority=data.get('priority', 'medium'),
            status=data.get('status', 'draft'),
            created_by=data['created_by'],
            is_admin_created=data.get('is_admin_created', False),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

class Task:
    def __init__(self,
                 title: str,
                 created_by: str,
                 description: Optional[str] = None,
                 objective_id: Optional[str] = None,
                 assigned_to: Optional[str] = None,
                 assigned_to_multiple: List[str] = None,
                 due_date: Optional[str] = None,
                 priority: str = 'medium',
                 status: str = 'not_started',
                 completion_percentage: int = 0,
                 notes: Optional[str] = None,
                 is_admin_created: bool = False,
                 is_standalone: bool = False,
                 created_at: Optional[str] = None,
                 updated_at: Optional[str] = None,
                 completed_at: Optional[str] = None,
                 id: Optional[str] = None):
        self.id = id
        self.title = title
        self.description = description
        self.objective_id = objective_id
        self.assigned_to = assigned_to
        self.assigned_to_multiple = assigned_to_multiple or []
        self.due_date = due_date
        self.priority = priority
        self.status = status
        self.completion_percentage = completion_percentage
        self.notes = notes
        self.created_by = created_by
        self.is_admin_created = is_admin_created
        self.is_standalone = is_standalone
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at
        self.completed_at = completed_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'objective_id': self.objective_id,
            'assigned_to': self.assigned_to,
            'assigned_to_multiple': self.assigned_to_multiple,
            'due_date': self.due_date,
            'priority': self.priority,
            'status': self.status,
            'completion_percentage': self.completion_percentage,
            'notes': self.notes,
            'created_by': self.created_by,
            'is_admin_created': self.is_admin_created,
            'is_standalone': self.is_standalone,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'completed_at': self.completed_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        return cls(
            id=data.get('id'),
            title=data['title'],
            description=data.get('description'),
            objective_id=data.get('objective_id'),
            assigned_to=data.get('assigned_to'),
            assigned_to_multiple=data.get('assigned_to_multiple', []),
            due_date=data.get('due_date'),
            priority=data.get('priority', 'medium'),
            status=data.get('status', 'not_started'),
            completion_percentage=data.get('completion_percentage', 0),
            notes=data.get('notes'),
            created_by=data['created_by'],
            is_admin_created=data.get('is_admin_created', False),
            is_standalone=data.get('is_standalone', False),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            completed_at=data.get('completed_at')
        )

class TaskUpdate:
    def __init__(self,
                 task_id: str,
                 updated_by: str,
                 progress: Optional[int] = None,
                 notes: Optional[str] = None,
                 attachments: List[Dict] = None,
                 created_at: Optional[str] = None,
                 id: Optional[str] = None):
        self.id = id
        self.task_id = task_id
        self.updated_by = updated_by
        self.progress = progress
        self.notes = notes
        self.attachments = attachments or []
        self.created_at = created_at or datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'task_id': self.task_id,
            'updated_by': self.updated_by,
            'progress': self.progress,
            'notes': self.notes,
            'attachments': self.attachments,
            'created_at': self.created_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskUpdate':
        return cls(
            id=data.get('id'),
            task_id=data['task_id'],
            updated_by=data['updated_by'],
            progress=data.get('progress'),
            notes=data.get('notes'),
            attachments=data.get('attachments', []),
            created_at=data.get('created_at')
        )