#!/bin/bash
# Apply full schema to Turso (prisma migrate deploy doesn't support libsql://)
# Usage: ./scripts/turso-migrate.sh [database-name]
# Default database: sd4-demo
# Requires: turso CLI logged in (turso auth login)

set -e
DB_NAME="${1:-sd4-demo}"
SCHEMA_FILE="prisma/full-schema.sql"

# Regenerate schema if needed (in case schema.prisma changed)
echo "Generating schema..."
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script 2>/dev/null > "$SCHEMA_FILE"

echo "Resetting database (drops existing tables)..."
turso db shell "$DB_NAME" < prisma/reset-turso.sql

echo "Applying schema to Turso database: $DB_NAME"
turso db shell "$DB_NAME" < "$SCHEMA_FILE"
echo ""
echo "Schema applied successfully. Refresh your app."
