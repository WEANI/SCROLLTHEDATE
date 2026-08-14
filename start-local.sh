#!/usr/bin/env bash
# Démarrage local Félicity — MySQL dédié (port 3307) + Vite (port 3100).
#
# Pourquoi une instance MySQL séparée : la MariaDB du port 3306 ne supporte pas
# les "lateral derived tables" que génère l'API relationnelle de Drizzle
# (ERROR 1054 sur les requêtes avec `with: {...}`). MySQL 9 les gère nativement.
set -euo pipefail

cd "$(dirname "$0")"

MYSQL_BIN=/usr/local/opt/mysql/bin
DATADIR=/usr/local/var/mysql-felicity
SOCKET=/tmp/mysql-felicity.sock
PORT=3307

if "$MYSQL_BIN/mysqladmin" --socket="$SOCKET" ping >/dev/null 2>&1; then
  echo "✓ MySQL déjà démarré sur le port $PORT"
else
  echo "→ Démarrage de MySQL sur le port $PORT…"
  "$MYSQL_BIN/mysqld" \
    --datadir="$DATADIR" \
    --port="$PORT" \
    --socket="$SOCKET" \
    --mysqlx=0 \
    --log-error="$DATADIR/error.log" &
  for _ in $(seq 1 30); do
    "$MYSQL_BIN/mysqladmin" --socket="$SOCKET" ping >/dev/null 2>&1 && break
    sleep 1
  done
  echo "✓ MySQL prêt"
fi

echo "→ Vite sur http://localhost:3100/"
exec npx vite --port 3100 --strictPort
