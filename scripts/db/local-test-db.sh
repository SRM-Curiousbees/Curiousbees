#!/usr/bin/env bash
# Disposable PostgreSQL test database without Docker (uses the local PostgreSQL
# binaries, e.g. Homebrew). Same endpoint as docker-compose.test.yml:
#
#   postgresql://cbtest:cbtest_local_only@127.0.0.1:55432/curiousbees?schema=public
#
#   scripts/db/local-test-db.sh init     # create the cluster in its own directory and start it
#   scripts/db/local-test-db.sh start|stop|status
#
# The cluster lives in CURIOUSBEES_TEST_DB_DIR (default: $TMPDIR/curiousbees-test-db),
# never in an existing PostgreSQL data directory. It listens on 127.0.0.1:55432
# only (no Unix socket) and carries the disposable marker the destructive test
# and reset scripts require (curiousbees.disposable_test_db = on). start/stop
# only act on a directory this script created.
set -euo pipefail

DIR="${CURIOUSBEES_TEST_DB_DIR:-${TMPDIR:-/tmp}/curiousbees-test-db}"
DIR="${DIR%/}"
OWNED="$DIR/.curiousbees-disposable-test-db"
PORT=55432
USER_NAME=cbtest
PASSWORD=cbtest_local_only   # test-only credential, same as docker-compose.test.yml
DB=curiousbees
# macOS: PostgreSQL refuses to start without a valid locale in the environment.
export LC_ALL=C LANG=C

server_options="-p $PORT -h 127.0.0.1 -k '' -c curiousbees.disposable_test_db=on"

die() { echo "❌ $*" >&2; exit 1; }
port_in_use() { lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; }
require_owned() { [[ -f "$OWNED" ]] || die "$DIR was not created by this script; refusing to touch it."; }
query() { PGPASSWORD="$PASSWORD" psql -X -h 127.0.0.1 -p "$PORT" -U "$USER_NAME" -d "$DB" -Atqc "$1"; }

case "${1:-}" in
  init)
    [[ -e "$DIR" ]] && die "$DIR already exists. Use 'start', or choose another CURIOUSBEES_TEST_DB_DIR."
    port_in_use && die "Port $PORT is already in use; stop that server first."
    mkdir -p "$DIR"
    pwfile="$(mktemp)"
    printf '%s' "$PASSWORD" > "$pwfile"
    initdb -D "$DIR/data" -U "$USER_NAME" --pwfile="$pwfile" --auth-local=scram-sha-256 --auth-host=scram-sha-256 -E UTF8 --locale=C >/dev/null
    rm -f "$pwfile"
    touch "$OWNED"
    pg_ctl -D "$DIR/data" -l "$DIR/server.log" -o "$server_options" -w start >/dev/null
    PGPASSWORD="$PASSWORD" createdb -h 127.0.0.1 -p "$PORT" -U "$USER_NAME" "$DB"
    query "ALTER DATABASE $DB SET curiousbees.disposable_test_db = 'on'" >/dev/null
    echo "✅ Disposable test database ready at 127.0.0.1:$PORT/$DB (data in $DIR)"
    ;;
  start)
    require_owned
    port_in_use && die "Port $PORT is already in use."
    pg_ctl -D "$DIR/data" -l "$DIR/server.log" -o "$server_options" -w start >/dev/null
    echo "✅ Started (data in $DIR)"
    ;;
  stop)
    require_owned
    pg_ctl -D "$DIR/data" -w stop >/dev/null
    echo "Stopped."
    ;;
  status)
    require_owned
    pg_ctl -D "$DIR/data" status >/dev/null && echo "running" || { echo "stopped"; exit 1; }
    echo "identity: $(query "select current_database() || ' / ' || current_user || ' / marker=' || coalesce(current_setting('curiousbees.disposable_test_db', true), '(none)') || ' / ' || current_setting('data_directory')")"
    ;;
  *)
    echo "Usage: $0 init|start|stop|status" >&2
    exit 2
    ;;
esac
