import { pasteIntoBlock } from "./paste.js";

async function main() {
  const logo = new URL("./codex-logo.png", import.meta.url).href;
  logseq.provideStyle(`
    a[href^="codex://threads/" i]::before {
      content: "";
      display: inline-block;
      width: 1.1em;
      height: 1.1em;
      margin-inline-end: .24em;
      vertical-align: -.18em;
      background: url("${logo}") center / contain no-repeat;
    }
  `);
  const host = window.parent;
  let titles = new Map();
  let loading;

  function refresh() {
    if (loading) return loading;
    loading = logseq.FileStorage.getItem("titles.json").then(raw => {
      if (!raw) return;
      const next = new Map();
      for (const [hostId, threadId, title] of JSON.parse(raw)) {
        if (!next.has(hostId)) next.set(hostId, new Map());
        next.get(hostId).set(threadId, title);
      }
      titles = next;
    }).catch(() => {
      // Keep the last valid snapshot if the local helper is temporarily unavailable.
    }).finally(() => { loading = undefined; });
    return loading;
  }

  await refresh();
  const onPaste = event => pasteIntoBlock(event, titles);
  const whenActive = () => { if (host.document.hasFocus()) refresh(); };
  host.addEventListener("paste", onPaste, true);
  host.addEventListener("focus", refresh);
  const timer = setInterval(whenActive, 5000);
  function cleanup() {
    host.removeEventListener("paste", onPaste, true);
    host.removeEventListener("focus", refresh);
    clearInterval(timer);
  }
  window.addEventListener("pagehide", cleanup, { once: true });
  logseq.beforeunload(cleanup);
}

logseq.ready(main).catch(error => console.error("[Codex 会话链接]", error));
