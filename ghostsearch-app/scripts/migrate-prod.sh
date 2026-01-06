#!/bin/bash

# Load environment variables from .env.prod
# The 'set -a' command exports all variables subsequently defined.
# The 'source' command reads and executes commands from the .env.prod file
# in the current shell, making its variables available.
set -a
source .env.prod
set +a
# Note: Variables loaded via 'source' and 'set -a' are isolated to this script's execution and do not affect the parent shell.

echo "Starting Drizzle Kit migration push..."

# Extract and display the relevant database URL (host and database name)
# This assumes your .env.prod contains a DATABASE_URL variable.
if [ -n "$DATABASE_URL" ]; then
  DB_INFO=$(echo "$DATABASE_URL" | sed -E 's|postgres://([^:]+:[^@]+@)?([^/:]+)(:[0-9]+)?/(.+)/\?.*|\2\3/\4|')
  echo "Migrating database at: $DB_INFO"
else
  echo "Warning: Neither DATABASE_URL nor DB_URL found in .env.prod. Cannot display database information."
fi

# Execute the Drizzle Kit push command
# Assumes drizzle.config.ts is correctly set up to pick up DATABASE_URL and other relevant env vars

echo "WARNING: This will push database migrations to the PRODUCTION database located at: $DB_INFO"
read -p "Are you sure you want to proceed? (yes/no): " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
  echo "Migration aborted by user."
  exit 1
fi

npx drizzle-kit push

echo "Drizzle Kit migration push completed."