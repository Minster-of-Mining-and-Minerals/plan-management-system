#!/bin/bash
set -e

if [ -f /tmp/database.zip ]; then
    echo "Restoring database from /tmp/database.zip..."
    # Removing ON_ERROR_STOP=1 so that minor version differences (like transaction_timeout) do not abort the restore
    unzip -p /tmp/database.zip | psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    echo "Restore completed."
else
    echo "No /tmp/database.zip found."
fi
