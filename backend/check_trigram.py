import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

def check_and_create_extension():
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM pg_extension WHERE extname = 'pg_trgm'")
        row = cursor.fetchone()
        if row:
            print("pg_trgm extension is ALREADY INSTALLED.")
        else:
            print("pg_trgm extension is MISSING. Attempting to create it...")
            try:
                cursor.execute("CREATE EXTENSION pg_trgm;")
                print("SUCCESS: pg_trgm extension created.")
            except Exception as e:
                print(f"ERROR: Failed to create extension. {e}")

if __name__ == "__main__":
    check_and_create_extension()
