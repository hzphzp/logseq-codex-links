const threadPath = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

function parseThread(text) {
  if (!/^codex:\/\/threads\//i.test(text)) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const id = threadPath.exec(url.pathname)?.[1]?.toLowerCase();
  if (!id) return null;
  const host = url.searchParams.get("hostId") || "local";
  // Unescaped parentheses can terminate a Markdown link destination.
  const href = url.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return { id, host, href };
}

function linkLabel(title) {
  // Logseq's inline parser displays backslashes used to escape square brackets.
  return title.replace(/\s+/gu, " ").trim()
    .replaceAll("\\", "＼").replaceAll("[", "［").replaceAll("]", "］");
}

export function formatPaste(text, titles) {
  if (!text || !/^\s*codex:\/\/threads\//i.test(text)) return null;
  const links = text.trim().split(/\s+/u).map(parseThread);
  if (links.some(link => !link)) return null;
  return links.map(({ id, host, href }) => {
    const name = titles.get(host)?.get(id);
    const label = (name && linkLabel(name)) || `Codex 会话 ${id.slice(0, 8)}`;
    return `[${label}](${href})`;
  }).join(" · ");
}

export function pasteIntoBlock(event, titles) {
  const input = event.target;
  if (event.defaultPrevented || !input?.matches?.(".block-editor textarea") ||
      input.disabled || input.readOnly || input.ownerDocument.activeElement !== input) return;
  const data = event.clipboardData;
  if (!data || data.files.length) return;
  const text = data.getData("text/plain") || data.getData("text/uri-list");
  const markdown = formatPaste(text, titles);
  if (markdown === null) return;
  // Complete the paste in the original selection, through the editor's normal
  // input and undo flow. No delayed writes to whichever block is focused next.
  if (input.ownerDocument.execCommand("insertText", false, markdown)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
