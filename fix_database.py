#!/usr/bin/env python3
"""
Database schema fix script to add message formatting columns.
"""
import sqlite3
import os

def add_missing_columns():
    """Add missing columns to the forwarding_pairs table."""
    db_path = "app.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(forwarding_pairs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add missing columns
        if 'custom_header' not in columns:
            cursor.execute("ALTER TABLE forwarding_pairs ADD COLUMN custom_header TEXT")
            print("Added custom_header column")
        
        if 'custom_footer' not in columns:
            cursor.execute("ALTER TABLE forwarding_pairs ADD COLUMN custom_footer TEXT")
            print("Added custom_footer column")
        
        if 'remove_header' not in columns:
            cursor.execute("ALTER TABLE forwarding_pairs ADD COLUMN remove_header BOOLEAN DEFAULT 0")
            print("Added remove_header column")
        
        if 'remove_footer' not in columns:
            cursor.execute("ALTER TABLE forwarding_pairs ADD COLUMN remove_footer BOOLEAN DEFAULT 0")
            print("Added remove_footer column")
        
        conn.commit()
        print("Database schema updated successfully!")
        
    except Exception as e:
        print(f"Error updating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_missing_columns()