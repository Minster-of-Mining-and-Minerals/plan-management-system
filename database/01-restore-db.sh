#!/bin/bash
set -e

if [ -f /tmp/database.zip ]; then
    echo "Restoring database from /tmp/database.zip..."
    # Strip PG 17+ specific config (like transaction_timeout) not supported by PG 16
    unzip -p /tmp/database.zip | sed '/^SET transaction_timeout =/d' | psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    echo "Restore completed."
else
    echo "No /tmp/database.zip found."
fi
