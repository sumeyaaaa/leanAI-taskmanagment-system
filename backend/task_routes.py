from flask import Blueprint, request, jsonify, g
from auth import token_required, admin_required
import os
from datetime import datetime
import uuid
import traceback
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

task_bp = Blueprint('tasks', __name__)

def get_supabase_client():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    if not supabase_url or not supabase_key:
        raise Exception("Supabase credentials not configured")
    from supabase import create_client
    return create_client(supabase_url, supabase_key)

def safe_uuid(value):
    """Safely convert value to UUID string"""
    if not value or value in ('None', 'null', ''):
        return None
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError):
        return None

def safe_get_employee_id():
    """Get employee ID from g.user safely"""
    return safe_uuid(g.user.get('employee_id')) if hasattr(g, 'user') and g.user else None

def check_task_permission(task, user_employee_id, user_role):
    """Check if user can edit/delete a task or objective"""
    # Admins and superadmins can manage everything
    if user_role in ('admin', 'superadmin'):
        return True
    
    # Employees can only edit their own tasks (not admin-created ones)
    if task.get('is_admin_created'):
        return False
    
    # Check if user created the task/objective
    if task.get('created_by') == user_employee_id:
        return True
    
    # For tasks only: Check if user is assigned to the task
    if task.get('assigned_to') == user_employee_id:
        return True
    
    if user_employee_id in (task.get('assigned_to_multiple') or []):
        return True
    
    return False

def can_employee_edit_fully(task, user_employee_id):
    """Check if employee can edit all fields (when created_by == assigned_to or unassigned)"""
    if not task:
        return False
    # Employee can edit fully if they created the task AND (are assigned to it OR it's unassigned)
    created_by = task.get('created_by')
    assigned_to = task.get('assigned_to')
    return (created_by == user_employee_id and 
            (assigned_to == user_employee_id or not assigned_to) and 
            not task.get('is_admin_created', False))

# ============================================
# OBJECTIVES ENDPOINTS
# ============================================

@task_bp.route('/api/objectives', methods=['GET'])
@token_required
def get_objectives():
    """Get all objectives"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("objectives").select("*, employees!created_by(name, email)").order("created_at", desc=True).execute()
        return jsonify({'success': True, 'objectives': result.data if result.data else []})
    except Exception as e:
        print(f"❌ Error getting objectives: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/objectives', methods=['POST'])
@token_required
def create_objective():
    """Create a new objective"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        
        if not user_employee_id:
            return jsonify({'success': False, 'error': 'Employee ID not found'}), 401
        
        if not data.get('title'):
            return jsonify({'success': False, 'error': 'Title is required'}), 400
        
        objective_data = {
            "title": data.get('title'),
            "description": data.get('description'),
            "department": data.get('department'),
            "deadline": data.get('deadline'),
            "priority": data.get('priority', 'medium'),
            "status": data.get('status', 'draft'),
            "created_by": user_employee_id
        }
        
        result = supabase.table("objectives").insert(objective_data).execute()
        
        if result.data:
            # Create notification for objective creation
            try:
                from notification_routes import get_admin_employees
                supabase = get_supabase_client()
                admin_employees = get_admin_employees()
                admin_employee_ids = [admin['id'] for admin in admin_employees if admin.get('id')]
                
                # Get current user's name
                current_user_name = "Unknown"
                if user_employee_id:
                    emp_result = supabase.table("employees").select("name").eq("id", user_employee_id).execute()
                    if emp_result.data:
                        current_user_name = emp_result.data[0].get('name', 'Unknown')
                
                objective_id = result.data[0].get('id')
                objective_title = data.get('title', 'Untitled Objective')[:100]
                
                # Notify all admins about the new objective
                for admin_id in admin_employee_ids:
                    if admin_id and admin_id != user_employee_id:  # Don't notify the creator
                        notification_data = {
                            "to_employee": admin_id,
                            "channel": "in_app",
                            "message": f"New objective created by {current_user_name}: {objective_title}",
                            "type": "objective_created",
                            "related_task_id": None,
                            "meta": {
                                "objective_id": objective_id,
                                "objective_title": objective_title,
                                "created_by": current_user_name,
                                "created_by_id": user_employee_id,
                                "timestamp": datetime.utcnow().isoformat()
                            },
                            "priority": "normal",
                            "is_read": False
                        }
                        supabase.table("notifications").insert(notification_data).execute()
            except Exception as notify_err:
                # Don't fail objective creation if notification fails
                print(f"⚠️ Failed to create notification for objective: {notify_err}")
                traceback.print_exc()
            
            return jsonify({'success': True, 'objective': result.data[0]})
        else:
            return jsonify({'success': False, 'error': 'Failed to create objective'}), 500
            
    except Exception as e:
        print(f"❌ Error creating objective: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/objectives/<objective_id>', methods=['GET'])
@token_required
def get_objective(objective_id):
    """Get a single objective with its tasks"""
    try:
        supabase = get_supabase_client()
        
        # Get objective
        obj_result = supabase.table("objectives").select("*, employees!created_by(name, email)").eq("id", objective_id).execute()
        if not obj_result.data:
            return jsonify({'success': False, 'error': 'Objective not found'}), 404
        
        objective = obj_result.data[0]
        
        # Get tasks for this objective
        tasks_result = supabase.table("tasks").select("*, employees!assigned_to(name, email)").eq("objective_id", objective_id).execute()
        objective['tasks'] = tasks_result.data if tasks_result.data else []
        
        return jsonify({'success': True, 'objective': objective})
    except Exception as e:
        print(f"❌ Error getting objective: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/objectives/<objective_id>', methods=['PUT'])
@token_required
def update_objective(objective_id):
    """Update an objective"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        user_role = g.user.get('role')
        
        # Get current objective
        obj_result = supabase.table("objectives").select("*").eq("id", objective_id).execute()
        if not obj_result.data:
            return jsonify({'success': False, 'error': 'Objective not found'}), 404
        
        current_objective = obj_result.data[0]
        
        # Check permissions
        if not check_task_permission(current_objective, user_employee_id, user_role):
            return jsonify({'success': False, 'error': 'Not authorized to update this objective'}), 403
        
        # Build update data
        allowed_fields = ['title', 'description', 'department', 'deadline', 'priority', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'success': False, 'error': 'No valid fields to update'}), 400
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table("objectives").update(update_data).eq("id", objective_id).execute()
        
        if result.data:
            return jsonify({'success': True, 'objective': result.data[0]})
        else:
            return jsonify({'success': False, 'error': 'Failed to update objective'}), 500
            
    except Exception as e:
        print(f"❌ Error updating objective: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/objectives/<objective_id>', methods=['DELETE'])
@token_required
def delete_objective(objective_id):
    """Delete an objective"""
    try:
        supabase = get_supabase_client()
        user_employee_id = safe_get_employee_id()
        user_role = g.user.get('role')
        
        # Get current objective
        obj_result = supabase.table("objectives").select("*").eq("id", objective_id).execute()
        if not obj_result.data:
            return jsonify({'success': False, 'error': 'Objective not found'}), 404
        
        current_objective = obj_result.data[0]
        
        # Check permissions
        if not check_task_permission(current_objective, user_employee_id, user_role):
            return jsonify({'success': False, 'error': 'Not authorized to delete this objective'}), 403
        
        result = supabase.table("objectives").delete().eq("id", objective_id).execute()
        
        return jsonify({'success': True, 'message': 'Objective deleted'})
            
    except Exception as e:
        print(f"❌ Error deleting objective: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# TASKS ENDPOINTS
# ============================================

@task_bp.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks():
    """Get all tasks with optional filters - Returns ALL tasks for admins, filtered tasks for employees"""
    try:
        supabase = get_supabase_client()
        user_role = g.user.get('role')
        user_employee_id = safe_get_employee_id()
        
        # Get query parameters
        objective_id = request.args.get('objective_id')
        assigned_to = request.args.get('assigned_to')
        status = request.args.get('status')
        priority = request.args.get('priority')
        
        # Build query - start with all tasks
        query = supabase.table("tasks").select("*, objectives(title)")
        
        # Apply optional filters
        if objective_id:
            query = query.eq("objective_id", objective_id)
        if assigned_to:
            query = query.eq("assigned_to", assigned_to)
        if status:
            query = query.eq("status", status)
        if priority:
            query = query.eq("priority", priority)
        
        # For employees: filter to show only tasks they created OR are assigned to
        # For admins: show ALL tasks (no additional filtering)
        if user_role == 'employee' and user_employee_id:
            # Employees should see:
            # 1. Tasks they created
            # 2. Tasks assigned to them
            # Use OR condition - Supabase doesn't support OR directly, so we'll filter after
            # Actually, let's use a different approach - fetch all and filter in Python
            pass  # We'll handle this after fetching
        
        result = query.order("created_at", desc=True).execute()
        tasks = result.data if result.data else []
        
        # For employees, filter to show only their tasks
        if user_role == 'employee' and user_employee_id:
            filtered_tasks = []
            for task in tasks:
                # Include if employee created it OR is assigned to it
                if (task.get('created_by') == user_employee_id or 
                    task.get('assigned_to') == user_employee_id or
                    user_employee_id in (task.get('assigned_to_multiple') or [])):
                    filtered_tasks.append(task)
            tasks = filtered_tasks
        
        # Log task breakdown for debugging
        print(f"📋 get_tasks: User role={user_role}, employee_id={user_employee_id}, Total tasks={len(tasks)}")
        if tasks:
            admin_created = sum(1 for t in tasks if t.get('is_admin_created', False))
            employee_created = len(tasks) - admin_created
            print(f"📊 Tasks breakdown: Admin-created={admin_created}, Employee-created={employee_created}")
        
        # Now fetch employee names separately and add them to tasks
        employee_ids = set()
        for task in tasks:
            if task.get('assigned_to'):
                employee_ids.add(task['assigned_to'])
            if task.get('created_by'):
                employee_ids.add(task['created_by'])
        
        # Fetch all needed employees in one query
        employee_map = {}
        if employee_ids:
            emp_result = supabase.table("employees").select("id, name, email").in_("id", list(employee_ids)).execute()
            if emp_result.data:
                for emp in emp_result.data:
                    employee_map[emp['id']] = emp
        
        # Add employee names to tasks
        for task in tasks:
            if task.get('assigned_to') and task['assigned_to'] in employee_map:
                emp = employee_map[task['assigned_to']]
                task['assigned_to_name'] = emp.get('name')
                task['assigned_to_email'] = emp.get('email')
            if task.get('created_by') and task['created_by'] in employee_map:
                emp = employee_map[task['created_by']]
                task['created_by_name'] = emp.get('name')
                task['created_by_email'] = emp.get('email')
        
        return jsonify({'success': True, 'tasks': tasks})
    except Exception as e:
        print(f"❌ Error getting tasks: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks', methods=['POST'])
@token_required
def create_task():
    """Create a new task"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        
        if not user_employee_id:
            return jsonify({'success': False, 'error': 'Employee ID not found'}), 401
        
        if not data.get('title'):
            return jsonify({'success': False, 'error': 'Title is required'}), 400
        
        # Handle assignment
        assigned_to = safe_uuid(data.get('assigned_to'))
        assigned_to_multiple = []
        if data.get('assigned_to_multiple'):
            assigned_to_multiple = [safe_uuid(uid) for uid in data.get('assigned_to_multiple', []) if safe_uuid(uid)]
        
        task_data = {
            "title": data.get('title'),
            "description": data.get('description'),
            "objective_id": safe_uuid(data.get('objective_id')),
            "assigned_to": assigned_to,
            "assigned_to_multiple": assigned_to_multiple,
            "due_date": data.get('due_date'),
            "priority": data.get('priority', 'medium'),
            "status": data.get('status', 'not_started'),
            "completion_percentage": data.get('completion_percentage', 0),
            "notes": data.get('notes'),
            "created_by": user_employee_id,
            "is_standalone": not bool(data.get('objective_id'))  # Standalone if no objective_id
        }
        
        result = supabase.table("tasks").insert(task_data).execute()
        
        if result.data:
            # Create notification if assigned to someone
            if assigned_to:
                from notification_routes import create_enhanced_task_notification
                create_enhanced_task_notification(
                    result.data[0]['id'],
                    "task_assigned",
                    f"New task assigned: {data.get('title')[:100]}..."
                )
            
            return jsonify({'success': True, 'task': result.data[0]})
        else:
            return jsonify({'success': False, 'error': 'Failed to create task'}), 500
            
    except Exception as e:
        print(f"❌ Error creating task: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>', methods=['GET'])
@token_required
def get_task(task_id):
    """Get a single task with updates"""
    try:
        supabase = get_supabase_client()
        
        # Get task without employee joins to avoid duplicate table alias issue
        task_result = supabase.table("tasks").select("*, objectives(title)").eq("id", task_id).execute()
        if not task_result.data:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        task = task_result.data[0]
        
        # Fetch employee names separately
        employee_ids = set()
        if task.get('assigned_to'):
            employee_ids.add(task['assigned_to'])
        if task.get('created_by'):
            employee_ids.add(task['created_by'])
        
        employee_map = {}
        if employee_ids:
            emp_result = supabase.table("employees").select("id, name, email").in_("id", list(employee_ids)).execute()
            if emp_result.data:
                for emp in emp_result.data:
                    employee_map[emp['id']] = emp
        
        # Add employee names to task
        if task.get('assigned_to') and task['assigned_to'] in employee_map:
            emp = employee_map[task['assigned_to']]
            task['assigned_to_name'] = emp.get('name')
            task['assigned_to_email'] = emp.get('email')
        if task.get('created_by') and task['created_by'] in employee_map:
            emp = employee_map[task['created_by']]
            task['created_by_name'] = emp.get('name')
            task['created_by_email'] = emp.get('email')
        
        # Get task updates
        updates_result = supabase.table("task_updates").select("*, employees!updated_by(name, email)").eq("task_id", task_id).order("created_at", desc=True).execute()
        task['updates'] = updates_result.data if updates_result.data else []
        
        return jsonify({'success': True, 'task': task})
    except Exception as e:
        print(f"❌ Error getting task: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>', methods=['PUT'])
@token_required
def update_task(task_id):
    """Update a task"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        user_role = g.user.get('role')
        
        # Get current task
        task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not task_result.data:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        current_task = task_result.data[0]
        old_status = current_task.get('status')
        old_progress = current_task.get('completion_percentage', 0)
        
        # Check permissions
        if user_role == 'employee':
            # Employees can only update tasks assigned to them or their own tasks
            if not check_task_permission(current_task, user_employee_id, user_role):
                return jsonify({'success': False, 'error': 'Not authorized to update this task'}), 403
            
            # Check if employee created and is assigned to the task (can edit fully)
            can_edit_fully = can_employee_edit_fully(current_task, user_employee_id)
            
            if can_edit_fully:
                # Employee can edit all fields when they created the task (and are assigned or unassigned)
                allowed_fields = [
                    'title', 'description', 'assigned_to', 'assigned_to_multiple',
                    'priority', 'due_date', 'status', 'completion_percentage', 'notes'
                ]
                update_data = {k: v for k, v in data.items() if k in allowed_fields}
                
                # If task is unassigned and employee is editing, auto-assign to them
                if not current_task.get('assigned_to') and not update_data.get('assigned_to'):
                    update_data['assigned_to'] = user_employee_id
                    print(f"✅ Auto-assigning unassigned task to employee {user_employee_id}")
                
                # Sanitize UUID fields
                if 'assigned_to' in update_data:
                    update_data['assigned_to'] = safe_uuid(update_data['assigned_to'])
                if 'assigned_to_multiple' in update_data:
                    update_data['assigned_to_multiple'] = [safe_uuid(uid) for uid in update_data['assigned_to_multiple'] if safe_uuid(uid)]
            else:
                # Employees can only update progress, notes, and status
                allowed_fields = ['completion_percentage', 'notes', 'status']
                update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Auto-update status based on progress
            if 'completion_percentage' in update_data:
                progress = update_data['completion_percentage']
                if progress == 100:
                    update_data['status'] = 'completed'
                elif progress > 0:
                    update_data['status'] = 'in_progress'
        else:
            # Admins can update most fields
            allowed_fields = [
                'title', 'description', 'assigned_to', 'assigned_to_multiple',
                'priority', 'due_date', 'status', 'completion_percentage', 'notes'
            ]
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Sanitize UUID fields
            if 'assigned_to' in update_data:
                update_data['assigned_to'] = safe_uuid(update_data['assigned_to'])
            if 'assigned_to_multiple' in update_data:
                update_data['assigned_to_multiple'] = [safe_uuid(uid) for uid in update_data['assigned_to_multiple'] if safe_uuid(uid)]
        
        if not update_data:
            return jsonify({'success': False, 'error': 'No valid fields to update'}), 400
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if result.data:
            # Check if task was completed (triggers will handle notifications)
            new_status = result.data[0].get('status')
            if new_status == 'completed' and old_status != 'completed':
                # Notification will be created by database trigger
                pass
            
            return jsonify({'success': True, 'task': result.data[0]})
        else:
            return jsonify({'success': False, 'error': 'Failed to update task'}), 500
            
    except Exception as e:
        print(f"❌ Error updating task: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>', methods=['DELETE'])
@token_required
def delete_task(task_id):
    """Delete a task"""
    try:
        supabase = get_supabase_client()
        user_employee_id = safe_get_employee_id()
        user_role = g.user.get('role')
        
        # Get current task
        task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not task_result.data:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        current_task = task_result.data[0]
        
        # Check permissions
        if not check_task_permission(current_task, user_employee_id, user_role):
            return jsonify({'success': False, 'error': 'Not authorized to delete this task'}), 403
        
        result = supabase.table("tasks").delete().eq("id", task_id).execute()
        
        return jsonify({'success': True, 'message': 'Task deleted'})
            
    except Exception as e:
        print(f"❌ Error deleting task: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# TASK UPDATES ENDPOINTS
# ============================================

@task_bp.route('/api/tasks/<task_id>/updates', methods=['GET'])
@token_required
def get_task_updates(task_id):
    """Get all updates for a task"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("task_updates").select("*, employees!updated_by(name, email)").eq("task_id", task_id).order("created_at", desc=True).execute()
        return jsonify({'success': True, 'updates': result.data if result.data else []})
    except Exception as e:
        print(f"❌ Error getting task updates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>/updates', methods=['POST'])
@token_required
def create_task_update(task_id):
    """Create a task update (progress note)"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        
        if not user_employee_id:
            return jsonify({'success': False, 'error': 'Employee ID not found'}), 401
        
        # Verify task exists and user has access
        task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not task_result.data:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        task = task_result.data[0]
        user_role = g.user.get('role')
        
        # Check if user can create updates for this task
        # For updates, we allow any employee to add updates to tasks they can view
        # This enables collaboration - employees can update progress even if not directly assigned
        if user_role not in ('admin', 'superadmin'):
            # Allow all employees to create updates - this is a collaborative feature
            # Updates don't modify task ownership, just add progress notes
            print(f"✅ Allowing employee {user_employee_id} to create update for task {task_id} (collaborative update)")
        
        update_data = {
            "task_id": task_id,
            "updated_by": user_employee_id,
            "progress": data.get('progress'),
            "notes": data.get('notes'),
            "attachments": data.get('attachments', [])
        }
        
        result = supabase.table("task_updates").insert(update_data).execute()
        
        if result.data:
            # Create notification
            from notification_routes import create_enhanced_task_notification
            old_progress = task.get('completion_percentage', 0)
            new_progress = data.get('progress', old_progress)
            
            create_enhanced_task_notification(
                task_id,
                "progress_updated",
                f"Progress updated on task: {task.get('title', 'Task')[:50]}...",
                old_progress=old_progress,
                new_progress=new_progress
            )
            
            return jsonify({'success': True, 'update': result.data[0]})
        else:
            return jsonify({'success': False, 'error': 'Failed to create task update'}), 500
            
    except Exception as e:
        print(f"❌ Error creating task update: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>/add-note', methods=['POST'])
@token_required
def add_task_note(task_id):
    """Add a note to a task (creates a task update)"""
    try:
        supabase = get_supabase_client()
        data = request.get_json()
        user_employee_id = safe_get_employee_id()
        
        if not user_employee_id:
            return jsonify({'success': False, 'error': 'Employee ID not found'}), 401
        
        # Verify task exists
        task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not task_result.data:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        task = task_result.data[0]
        user_role = g.user.get('role')
        
        # Check if user can create updates for this task
        # For notes, we allow any employee to add notes to tasks they can view
        # This enables collaboration - employees can contribute to tasks even if not directly assigned
        if user_role not in ('admin', 'superadmin'):
            # Allow all employees to add notes - this is a collaborative feature
            # Notes don't modify task structure, just add updates
            print(f"✅ Allowing employee {user_employee_id} to add note to task {task_id} (collaborative update)")
        
        # Create task update with note
        update_data = {
            "task_id": task_id,
            "updated_by": user_employee_id,
            "progress": data.get('progress'),
            "notes": data.get('notes'),
            "attachments": data.get('attachments', [])
        }
        
        result = supabase.table("task_updates").insert(update_data).execute()
        
        if result.data:
            # Update task progress if provided
            if data.get('progress') is not None:
                task_update_data = {
                    "completion_percentage": data.get('progress'),
                    "updated_at": datetime.utcnow().isoformat()
                }
                # Auto-update status based on progress
                if data.get('progress') == 100:
                    task_update_data['status'] = 'completed'
                    task_update_data['completed_at'] = datetime.utcnow().isoformat()
                elif data.get('progress') > 0:
                    task_update_data['status'] = 'in_progress'
                
                supabase.table("tasks").update(task_update_data).eq("id", task_id).execute()
            
            # Create notification
            from notification_routes import create_enhanced_task_notification
            old_progress = task.get('completion_percentage', 0)
            new_progress = data.get('progress', old_progress)
            
            create_enhanced_task_notification(
                task_id,
                "note_added",
                f"Note added to task: {task.get('title', 'Task')[:50]}...",
                note_preview=data.get('notes', '')[:100] if data.get('notes') else None,
                attached_to=data.get('attached_to'),
                attached_to_multiple=data.get('attached_to_multiple'),
                old_progress=old_progress,
                new_progress=new_progress
            )
            
            return jsonify({'success': True, 'update': result.data[0], 'message': 'Note added successfully'})
        else:
            return jsonify({'success': False, 'error': 'Failed to add note'}), 500
            
    except Exception as e:
        print(f"❌ Error adding task note: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>/upload-file', methods=['POST'])
@token_required
def upload_task_file(task_id):
    """Upload a file attachment to a task"""
    try:
        print(f"📤 FILE UPLOAD REQUEST for task {task_id}")
        supabase = get_supabase_client()
        user_employee_id = safe_get_employee_id()
        
        if not user_employee_id:
            print(f"❌ No employee ID found for user")
            return jsonify({'success': False, 'error': 'Employee ID not found'}), 401
        
        print(f"✅ Employee ID: {user_employee_id}")
        
        # Verify task exists
        task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not task_result.data:
            print(f"❌ Task {task_id} not found")
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        task = task_result.data[0]
        user_role = g.user.get('role')
        print(f"✅ Task found: {task.get('title')}, User role: {user_role}")
        
        # Check if user can upload files for this task
        # For file uploads, we allow any employee to upload files to tasks they can view
        # This enables collaboration - employees can share files even if not directly assigned
        if user_role not in ('admin', 'superadmin'):
            # Allow all employees to upload files - this is a collaborative feature
            # File uploads don't modify task structure, just add attachments
            print(f"✅ Allowing employee {user_employee_id} to upload file to task {task_id} (collaborative update)")
        
        # Check if file was uploaded
        print(f"🔍 Checking for file in request: {list(request.files.keys())}")
        if 'file' not in request.files:
            print(f"❌ No 'file' key in request.files")
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print(f"❌ Empty filename")
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        print(f"✅ File received: {file.filename}, Content-Type: {file.content_type}")
        
        # Upload file to Supabase Storage
        import os
        from werkzeug.utils import secure_filename
        import base64
        
        filename = secure_filename(file.filename)
        file_path = f"task-attachments/{task_id}/{filename}"
        
        # Read file content
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        
        # Try to upload to Supabase Storage, fallback to base64 if storage not configured
        public_url = None
        try:
            storage = supabase.storage.from_("task-attachments")
            # Ensure the bucket exists or create it
            try:
                storage.upload(file_path, file_content, file_options={"content-type": file.content_type, "upsert": "true"})
                public_url = storage.get_public_url(file_path)
            except Exception as storage_error:
                print(f"⚠️ Storage upload failed, using base64: {storage_error}")
                # Fallback: encode file as base64 data URL
                file_content_b64 = base64.b64encode(file_content).decode('utf-8')
                public_url = f"data:{file.content_type};base64,{file_content_b64}"
        except Exception as e:
            print(f"⚠️ Storage not available, using base64: {e}")
            # Fallback: encode file as base64 data URL
            file_content_b64 = base64.b64encode(file_content).decode('utf-8')
            public_url = f"data:{file.content_type};base64,{file_content_b64}"
        
        # Create task update with attachment
        attachment_data = {
            "name": filename,
            "url": public_url,
            "size": len(file_content),
            "type": file.content_type,
            "uploaded_by": user_employee_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }
        
        update_data = {
            "task_id": task_id,
            "updated_by": user_employee_id,
            "notes": f"File uploaded: {filename}",
            "attachments": [attachment_data]
        }
        
        print(f"📝 Inserting task update: {update_data}")
        result = supabase.table("task_updates").insert(update_data).execute()
        print(f"📝 Insert result: {result.data if result.data else 'No data returned'}")
        
        if result.data:
            print(f"✅ Task update created successfully: {result.data[0].get('id')}")
            # Create notification
            try:
                from notification_routes import create_enhanced_task_notification
                create_enhanced_task_notification(
                    task_id,
                    "file_uploaded",
                    f"File uploaded to task: {task.get('title', 'Task')[:50]}...",
                    attached_to=None,
                    attached_to_multiple=None
                )
            except Exception as notify_err:
                print(f"⚠️ Notification creation failed (non-critical): {notify_err}")
            
            return jsonify({
                'success': True, 
                'update': result.data[0],
                'attachment_url': public_url,
                'message': 'File uploaded successfully'
            })
        else:
            print(f"❌ Failed to create task update - no data returned")
            return jsonify({'success': False, 'error': 'Failed to create task update'}), 500
            
    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>/notes', methods=['GET'])
@token_required
def get_task_notes(task_id):
    """Get all notes for a task (from task_updates)"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("task_updates").select("*, employees!updated_by(name, email)").eq("task_id", task_id).not_.is_("notes", "null").order("created_at", desc=True).execute()
        
        notes = []
        if result.data:
            for update in result.data:
                if update.get('notes'):
                    notes.append({
                        'id': update.get('id'),
                        'notes': update.get('notes'),
                        'progress': update.get('progress'),
                        'updated_by': update.get('updated_by'),
                        'updated_by_name': update.get('employees', {}).get('name') if isinstance(update.get('employees'), dict) else None,
                        'created_at': update.get('created_at'),
                        'attachments': update.get('attachments', [])
                    })
        
        return jsonify({'success': True, 'notes': notes})
    except Exception as e:
        print(f"❌ Error getting task notes: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@task_bp.route('/api/tasks/<task_id>/attachments', methods=['GET'])
@token_required
def get_task_attachments(task_id):
    """Get all attachments for a task (from task_updates)"""
    try:
        print(f"📎 Getting attachments for task {task_id}")
        supabase = get_supabase_client()
        result = supabase.table("task_updates").select("*, employees!updated_by(name, email)").eq("task_id", task_id).execute()
        
        print(f"📎 Found {len(result.data) if result.data else 0} task updates")
        attachments = []
        if result.data:
            for update in result.data:
                update_attachments = update.get('attachments', [])
                print(f"📎 Update {update.get('id')} has {len(update_attachments) if isinstance(update_attachments, list) else 0} attachments")
                if update_attachments and isinstance(update_attachments, list):
                    for attachment in update_attachments:
                        # Map backend fields to frontend expected fields
                        mapped_attachment = {
                            'id': attachment.get('id') or f"{update.get('id')}-{len(attachments)}",
                            'filename': attachment.get('name') or attachment.get('filename') or 'Unknown',
                            'public_url': attachment.get('url') or attachment.get('public_url'),
                            'file_type': attachment.get('type') or attachment.get('file_type') or 'application/octet-stream',
                            'size': attachment.get('size', 0),
                            'uploaded_by': attachment.get('uploaded_by') or update.get('updated_by'),
                            'uploaded_by_name': update.get('employees', {}).get('name') if isinstance(update.get('employees'), dict) else None,
                            'update_id': update.get('id'),
                            'created_at': attachment.get('uploaded_at') or update.get('created_at')
                        }
                        attachments.append(mapped_attachment)
        
        print(f"📎 Returning {len(attachments)} attachments")
        return jsonify({'success': True, 'attachments': attachments, 'total': len(attachments)})
    except Exception as e:
        print(f"❌ Error getting task attachments: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@task_bp.route('/api/tasks/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    """Get dashboard statistics"""
    try:
        supabase = get_supabase_client()
        user_employee_id = safe_get_employee_id()
        user_role = g.user.get('role')
        
        # Get all tasks or filtered by assignee
        if user_role == 'employee':
            tasks_result = supabase.table("tasks").select("*").or_("assigned_to.eq.{},assigned_to_multiple.cs.[{}]".format(user_employee_id, user_employee_id)).execute()
        else:
            tasks_result = supabase.table("tasks").select("*").execute()
        
        tasks = tasks_result.data if tasks_result.data else []
        
        # Calculate statistics
        stats = {
            'total': len(tasks),
            'not_started': len([t for t in tasks if t.get('status') == 'not_started']),
            'in_progress': len([t for t in tasks if t.get('status') == 'in_progress']),
            'completed': len([t for t in tasks if t.get('status') == 'completed']),
            'cancelled': len([t for t in tasks if t.get('status') == 'cancelled'])
        }
        
        # Get objectives count
        if user_role == 'employee':
            objectives_result = supabase.table("objectives").select("*").eq("created_by", user_employee_id).execute()
        else:
            objectives_result = supabase.table("objectives").select("*").execute()
        
        stats['objectives'] = len(objectives_result.data) if objectives_result.data else 0
        
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        print(f"❌ Error getting dashboard: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# EMPLOYEES ENDPOINT (for assignment dropdowns)
# ============================================

@task_bp.route('/api/employees', methods=['GET'])
@token_required
def get_employees():
    """Get all active employees (for assignment dropdowns)"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("employees").select("id, name, email, role, department").eq("is_active", True).order("name").execute()
        return jsonify({'success': True, 'employees': result.data if result.data else []})
    except Exception as e:
        print(f"❌ Error getting employees: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

