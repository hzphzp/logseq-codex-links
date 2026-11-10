"""Build a private title index from the local Codex desktop catalog."""
import json
import os
from pathlib import Path
import sqlite3
import tempfile


def update(catalog, output):
    # mode=ro includes committed WAL updates and never creates a missing database.
    connection = sqlite3.connect(catalog.as_uri() + "?mode=ro", uri=True, timeout=2)
    try:
        rows = connection.execute("""
            SELECT host_id, lower(thread_id), display_title
              FROM local_thread_catalog
             WHERE trim(display_title) <> ''
             ORDER BY host_id, thread_id
        """).fetchall()
    finally:
        connection.close()
    data = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()
    if output.exists() and output.read_bytes() == data:
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as tmp:
        try:
            tmp.write(data)
            tmp.flush()
            os.replace(tmp.name, output)
        finally:
            Path(tmp.name).unlink(missing_ok=True)


if __name__ == "__main__":
    home = Path.home()
    update(home / ".codex/sqlite/codex.db", home / ".logseq/storages/logseq-codex-links/titles.json")
