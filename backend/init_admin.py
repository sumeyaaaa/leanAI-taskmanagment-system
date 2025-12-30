"""
Script to initialize or update admin@leanchem.com as admin
Run this script to ensure the admin employee record exists
"""
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def init_admin():
    """Initialize admin@leanchem.com as admin employee"""
    try:
        from supabase import create_client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not configured")
            return False
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Check if admin already exists
        admin_result = supabase.table("employees").select("id, role").eq("email", "admin@leanchem.com").execute()
        
        if admin_result.data:
            admin = admin_result.data[0]
            # Update role to admin if it's not already
            if admin.get('role') != 'admin':
                print(f"🔄 Updating existing admin record role to 'admin'...")
                update_result = supabase.table("employees").update({
                    'role': 'admin',
                    'department': 'IT',
                    'is_active': True,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq("id", admin['id']).execute()
                
                if update_result.data:
                    print(f"✅ Updated admin@leanchem.com to admin role")
                    return True
                else:
                    print(f"❌ Failed to update admin role")
                    return False
            else:
                print(f"✅ admin@leanchem.com already exists with admin role")
                return True
        else:
            # Create admin employee record
            print(f"📝 Creating admin@leanchem.com employee record...")
            admin_employee_data = {
                "name": "System Administrator",
                "email": "admin@leanchem.com",
                "role": "admin",
                "department": "IT",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            create_result = supabase.table("employees").insert(admin_employee_data).execute()
            
            if create_result.data:
                print(f"✅ Created admin employee record with ID: {create_result.data[0]['id']}")
                return True
            else:
                print("❌ Failed to create admin employee record")
                return False
                
    except Exception as e:
        print(f"❌ Error initializing admin: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Initializing admin@leanchem.com...")
    success = init_admin()
    if success:
        print("✅ Admin initialization complete!")
    else:
        print("❌ Admin initialization failed!")


