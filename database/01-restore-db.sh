#!/bin/bash
set -e

if [ -f /tmp/database.zip ]; then
    echo "Restoring database from /tmp/database.zip..."
    unzip -p /tmp/database.zip | psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    echo "Restore completed."
else
    echo "No /tmp/database.zip found."
fi
