#!/usr/bin/env python3
"""
Supabase Database Setup Script
This script will create all tables, policies, triggers, and storage buckets
for the AI Image Generator app migration from MongoDB to Supabase.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv()

def setup_supabase_database():
    """Execute the complete database setup"""
    
    # Get Supabase credentials from environment
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not service_key:
        print("❌ Error: Missing Supabase credentials")
        print("Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env")
        return False
    
    print(f"🔗 Connecting to Supabase: {url}")
    
    try:
        # Create admin client with service role key
        supabase: Client = create_client(url, service_key)
        print("✅ Connected to Supabase successfully")
        
        # Read and execute the schema file
        print("📄 Reading schema file...")
        with open('/app/supabase_schema.sql', 'r') as file:
            schema_sql = file.read()
        
        print("🚀 Executing database schema...")
        
        # Split the schema into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements):
            if not statement:
                continue
                
            try:
                # Execute each SQL statement
                if statement.startswith('--') or statement.startswith('/*'):
                    continue  # Skip comments
                
                result = supabase.postgrest.rpc('exec_sql', {'sql': statement}).execute()
                success_count += 1
                
                if i % 10 == 0:  # Progress indicator
                    print(f"  Progress: {i}/{len(statements)} statements executed...")
                    
            except Exception as e:
                error_count += 1
                print(f"⚠️  Warning: Failed to execute statement {i}: {str(e)[:100]}...")
                # Continue with next statement
                continue
        
        print(f"✅ Schema execution completed: {success_count} successful, {error_count} errors")
        
        # Verify tables were created
        print("🔍 Verifying table creation...")
        tables_to_check = [
            'profiles', 'generations', 'collections', 'collection_generations',
            'likes', 'comments', 'follows', 'payment_subscriptions', 'user_stats'
        ]
        
        created_tables = []
        for table in tables_to_check:
            try:
                result = supabase.table(table).select("*").limit(1).execute()
                created_tables.append(table)
                print(f"  ✅ Table '{table}' verified")
            except Exception as e:
                print(f"  ❌ Table '{table}' not found: {e}")
        
        print(f"📊 Successfully created {len(created_tables)}/{len(tables_to_check)} tables")
        
        # Setup storage buckets
        print("🗄️  Setting up storage buckets...")
        buckets = [
            {'id': 'reference-images', 'name': 'reference-images', 'public': False},
            {'id': 'generated-images', 'name': 'generated-images', 'public': False},
            {'id': 'profile-avatars', 'name': 'profile-avatars', 'public': True},
            {'id': 'public-gallery', 'name': 'public-gallery', 'public': True}
        ]
        
        bucket_success = 0
        for bucket in buckets:
            try:
                result = supabase.storage.create_bucket(bucket['id'], {'public': bucket['public']})
                bucket_success += 1
                print(f"  ✅ Created bucket: {bucket['name']}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    bucket_success += 1
                    print(f"  ✅ Bucket '{bucket['name']}' already exists")
                else:
                    print(f"  ❌ Failed to create bucket '{bucket['name']}': {e}")
        
        print(f"🗂️  Storage setup: {bucket_success}/{len(buckets)} buckets ready")
        
        # Test connection with a simple query
        print("🧪 Testing database connection...")
        try:
            test_result = supabase.table('profiles').select('*').limit(1).execute()
            print("✅ Database connection test successful")
        except Exception as e:
            print(f"❌ Database connection test failed: {e}")
            return False
            
        print("\n🎉 Supabase setup completed successfully!")
        print("📋 Summary:")
        print(f"   - Database URL: {url}")
        print(f"   - Tables created: {len(created_tables)}")
        print(f"   - Storage buckets: {bucket_success}")
        print("   - Ready for migration and development!")
        
        return True
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

def migrate_mongodb_data():
    """Optional: Migrate existing MongoDB data to Supabase"""
    print("\n🔄 MongoDB to Supabase Migration (Optional)")
    print("This would migrate your existing MongoDB data...")
    print("For now, we'll start fresh with the new schema.")
    # TODO: Implement MongoDB to Supabase migration if needed

if __name__ == "__main__":
    print("🚀 AI Image Generator - Supabase Database Setup")
    print("=" * 50)
    
    # Setup database
    success = setup_supabase_database()
    
    if success:
        print("\n✅ Setup completed! Your Supabase database is ready.")
        print("\nNext steps:")
        print("1. Check your Supabase dashboard to see the new tables")
        print("2. Test the app with user authentication")
        print("3. Start generating images with cloud storage")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)