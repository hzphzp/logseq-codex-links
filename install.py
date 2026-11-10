"""Install the Logseq plugin and its per-user macOS title indexer."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys


def main():
    src = Path(__file__).resolve().parent
    home = Path.home()
    plugin = home / ".logseq/plugins/logseq-codex-links"
    label = "local.logseq.codex-link-titles"
    agent = home / "Library/LaunchAgents" / (label + ".plist")
    domain = "gui/" + str(os.getuid())
    plugin.mkdir(parents=True, exist_ok=True)
    if src.resolve() != plugin.resolve():
        shutil.copytree(src / "vendor", plugin / "vendor", dirs_exist_ok=True)
        (plugin / "docs").mkdir(exist_ok=True)
        shutil.copy2(src / "docs/paste.png", plugin / "docs/paste.png")
        for name in ("package.json", "index.html", "main.js", "paste.js", "codex-logo.png", "icon.svg",
                     "update_titles.py", "install.py", "README.md", "LICENSE", "THIRD-PARTY.md"):
            shutil.copy2(src / name, plugin / name)
    python = "/usr/bin/python3"
    updater = str(plugin / "update_titles.py")
    subprocess.run([python, "-I", updater], check=True)
    catalog = str(home / ".codex/sqlite/codex.db")
    config = {
        "Label": label,
        "ProgramArguments": [python, "-I", updater],
        "WatchPaths": [catalog, catalog + "-wal"],
        "RunAtLoad": True,
        "StartInterval": 60,
        "ThrottleInterval": 5,
    }
    agent.parent.mkdir(parents=True, exist_ok=True)
    agent.write_bytes(plistlib.dumps(config))
    agent.chmod(0o600)
    if subprocess.run(["launchctl", "print", domain + "/" + label],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        subprocess.run(["launchctl", "bootout", domain + "/" + label], check=True)
    subprocess.run(["launchctl", "bootstrap", domain, str(agent)], check=True)
    print("Installed", plugin)


if __name__ == "__main__":
    if sys.platform != "darwin":
        raise SystemExit("This installer requires macOS.")
    main()
