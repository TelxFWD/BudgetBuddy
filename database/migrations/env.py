"""
Alembic migration environment configuration.
This file is used by Alembic to configure the migration environment.
"""

import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import your models and database configuration
from database.db import Base, DATABASE_URL
from database import models  # Import all models

# This is the Alembic Config object
config = context.config

# Set the SQLAlchemy URL in the config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

# Other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.
    
    Calls to context.execute() here emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_schemas=True,
        render_as_batch=True,  # For SQLite compatibility
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    
    In this scenario we need to create an Engine and associate a connection
    with the context.
    """
    
    # Create engine configuration
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = DATABASE_URL
    
    # Additional engine options
    configuration.setdefault("sqlalchemy.pool_pre_ping", "true")
    configuration.setdefault("sqlalchemy.pool_recycle", "300")
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
            render_as_batch=True,  # For SQLite compatibility
            # Custom naming convention for constraints
            process_revision_directives=process_revision_directives,
        )

        with context.begin_transaction():
            context.run_migrations()

def process_revision_directives(context, revision, directives):
    """
    Process revision directives to add custom logic.
    This can be used to modify the migration script generation.
    """
    # Check if this is an auto-generated migration
    migration_script = directives[0]
    
    # Add custom header comment
    if migration_script.head is None:
        migration_script.head = "# Initial migration"
    
    # You can add custom logic here to modify the migration
    # For example, to skip certain tables or add custom operations
    
    return directives

def include_name(name, type_, parent_names):
    """
    Determine whether to include a name in the migration.
    This can be used to exclude certain tables or schemas.
    """
    # Exclude temporary tables
    if type_ == "table" and name.startswith("temp_"):
        return False
    
    # Exclude system tables
    if type_ == "table" and name.startswith("pg_"):
        return False
    
    # Include everything else
    return True

def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    """
    Compare column types for differences.
    Return True if the types are different and should generate a migration.
    """
    # Handle special cases for type comparison
    
    # For PostgreSQL, treat VARCHAR and TEXT as equivalent
    if hasattr(inspected_type, 'python_type') and hasattr(metadata_type, 'python_type'):
        if (str(inspected_type).upper() in ['VARCHAR', 'TEXT'] and 
            str(metadata_type).upper() in ['VARCHAR', 'TEXT']):
            return False
    
    # Handle JSON type differences
    if (str(inspected_type).upper() == 'JSON' and 
        str(metadata_type).upper() in ['TEXT', 'VARCHAR']):
        return False
    
    # Default comparison
    return None  # Use default comparison

def compare_server_default(context, inspected_column, metadata_column, inspected_default, metadata_default, rendered_metadata_default):
    """
    Compare server defaults for differences.
    Return True if the defaults are different and should generate a migration.
    """
    # Handle function defaults
    if inspected_default and metadata_default:
        # Normalize function calls
        inspected_str = str(inspected_default).strip("'\"")
        metadata_str = str(rendered_metadata_default).strip("'\"")
        
        # Handle common function equivalents
        if ("now()" in inspected_str.lower() and 
            "func.now()" in metadata_str.lower()):
            return False
    
    # Default comparison
    return None  # Use default comparison

# Configure context with custom functions
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
