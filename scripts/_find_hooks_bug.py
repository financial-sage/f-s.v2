"""Find early returns that sit between React hook calls in the same function."""
from __future__ import annotations

import re
import os

ROOT = "src"
HOOK_RE = re.compile(
    r"(?<![.\w])(?:React\.)?(?:"
    r"use(?:State|Effect|Memo|Callback|Ref|LayoutEffect|Id|SyncExternalStore|"
    r"Transition|Reducer|ImperativeHandle|Context|DeferredValue|Optimistic|"
    r"InsertionEffect)"
    r"|use[A-Z]\w*"
    r")\s*(?:<[^>]*>)?\s*\("
)
FN_RE = re.compile(
    r"(?:export\s+default\s+function|export\s+function|function)\s+(\w+)\s*\([^)]*\)\s*\{"
)
EARLY_IF_RETURN = re.compile(
    r"^[ \t]{2,6}if\s*\([^)]+\)\s*(?:return\b|\{[ \t]*\n[ \t]*return\b)",
    re.M,
)


def find_body(text: str, brace_at: int) -> str | None:
    depth = 0
    for j, ch in enumerate(text[brace_at:], brace_at):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[brace_at + 1 : j]
    return None


def main() -> None:
    results: list[str] = []
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith((".tsx", ".ts")):
                continue
            path = os.path.join(dirpath, f)
            try:
                text = open(path, encoding="utf-8").read()
            except OSError:
                continue
            for fm in FN_RE.finditer(text):
                name = fm.group(1)
                brace_at = text.find("{", fm.end() - 1)
                if brace_at < 0:
                    continue
                body = find_body(text, brace_at)
                if not body:
                    continue
                hooks = [m.start() for m in HOOK_RE.finditer(body)]
                if len(hooks) < 2:
                    continue
                last_hook = hooks[-1]
                for em in EARLY_IF_RETURN.finditer(body):
                    rpos = em.start()
                    if rpos >= last_hook:
                        continue
                    if not any(h < rpos for h in hooks):
                        continue
                    if not any(h > rpos for h in hooks):
                        continue
                    # Skip returns clearly inside useEffect/useMemo/useCallback bodies:
                    # if the nearest preceding hook opens a callback and braces wrap this return.
                    prev_hooks = [h for h in hooks if h < rpos]
                    nearest = prev_hooks[-1]
                    between = body[nearest:rpos]
                    # Count open braces after the hook call's opening paren content start
                    # Heuristic: if between contains "=>" or "function" and more { than }, skip
                    opens = between.count("{") - between.count("}")
                    if opens > 0 and (
                        "=>" in between or re.search(r"\bfunction\b", between)
                    ):
                        continue
                    lineno = text[: brace_at + 1 + rpos].count("\n") + 1
                    snippet = em.group(0).split("\n")[0].strip()[:80]
                    results.append(f"{path}:{lineno}:{name}: {snippet}")

    for line in results:
        print(line)
    print(f"TOTAL {len(results)}")


if __name__ == "__main__":
    main()
