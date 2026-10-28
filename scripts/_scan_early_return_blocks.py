"""Detect: if (...) { return ... } at component top level, then later hooks."""
from __future__ import annotations

import os
import re

ROOT = "src"


def find_matching(text: str, open_idx: int, open_ch: str, close_ch: str) -> int | None:
    depth = 0
    i = open_idx
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in "\"'`":
            q = ch
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if text.startswith("//", i):
            while i < n and text[i] != "\n":
                i += 1
            continue
        if text.startswith("/*", i):
            j = text.find("*/", i)
            i = j + 2 if j >= 0 else n
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return None


def scan_component(path: str, name: str, body: str, file_text: str, body_abs_start: int) -> None:
    depth = 0
    i = 0
    n = len(body)
    events: list[tuple[int, str, str]] = []

    while i < n:
        ch = body[i]
        if ch in "\"'`":
            q = ch
            i += 1
            while i < n:
                if body[i] == "\\":
                    i += 2
                    continue
                if body[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if body.startswith("//", i):
            while i < n and body[i] != "\n":
                i += 1
            continue
        if body.startswith("/*", i):
            j = body.find("*/", i)
            i = j + 2 if j >= 0 else n
            continue

        if depth == 0:
            line_start = body.rfind("\n", 0, i) + 1
            at_stmt = i == line_start or body[line_start:i].strip() == ""
            if at_stmt:
                rest = body[i:]
                line_no = file_text[: body_abs_start + i].count("\n") + 1

                # Single-line if (...) return
                m = re.match(r"if\s*\([^)]+\)\s*return\b[^\n]*", rest)
                if m:
                    events.append((line_no, "EARLY", m.group(0)[:90]))
                    i += m.end()
                    continue

                # Multi-line if (...) { return ... }
                m2 = re.match(r"if\s*\([^)]+\)\s*\{", rest)
                if m2:
                    brace_at = i + m2.end() - 1
                    close = find_matching(body, brace_at, "{", "}")
                    if close is not None:
                        block = body[brace_at + 1 : close]
                        # Consider early-return if block's first non-comment stmt is return
                        stripped = re.sub(r"//[^\n]*", "", block)
                        stripped = re.sub(r"/\*.*?\*/", "", stripped, flags=re.S).strip()
                        if re.match(r"return\b", stripped):
                            events.append(
                                (line_no, "EARLY", f"if (…) {{ return … }} :: {stripped.split(chr(10))[0][:60]}")
                            )
                        i = close + 1
                        continue

                hm = re.match(
                    r"(?:const|let)\s+[^=]+=\s*(?:React\.)?(use[A-Z]\w*)",
                    rest,
                )
                hm2 = re.match(
                    r"(?:React\.)?(use(?:Effect|LayoutEffect|InsertionEffect))\s*\(",
                    rest,
                )
                if hm:
                    events.append((line_no, "HOOK", hm.group(1)))
                elif hm2:
                    events.append((line_no, "HOOK", hm2.group(1)))

                # bare return (final render) — stop considering later hooks after this
                if re.match(r"return\b", rest) and not re.match(r"return\s*\(", rest[:20]) is False:
                    # only mark as FINAL if it's the component return
                    if re.match(r"return\s*[\(\<\n]", rest) or re.match(r"return\s+null\b", rest):
                        events.append((line_no, "FINAL", "return"))

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1

    hooks = [e for e in events if e[1] == "HOOK"]
    if not hooks:
        return
    last_hook_line = hooks[-1][0]
    for e in events:
        if e[1] == "EARLY" and e[0] < last_hook_line:
            before = [h for h in hooks if h[0] < e[0]]
            after = [h for h in hooks if h[0] > e[0]]
            if after:
                print(f"BUG {path}::{name}")
                print(f"  early-return L{e[0]}: {e[2]}")
                print(f"  hooks before: {len(before)}, after: {len(after)}")
                print(f"  first after: L{after[0][0]} {after[0][2]}")
                print(f"  last hook: L{hooks[-1][0]} {hooks[-1][2]}")


def main() -> None:
    fn_re = re.compile(
        r"(?:export\s+default\s+function|export\s+function|function)\s+(\w+)\s*\([^)]*\)\s*\{"
    )
    for dp, _, fs in os.walk(ROOT):
        for f in fs:
            if not f.endswith(".tsx"):
                continue
            path = os.path.join(dp, f)
            text = open(path, encoding="utf-8").read()
            for m in fn_re.finditer(text):
                name = m.group(1)
                start = m.end() - 1
                end = find_matching(text, start, "{", "}")
                if end is None:
                    continue
                body = text[start + 1 : end]
                scan_component(path, name, body, text, start + 1)
    print("done")


if __name__ == "__main__":
    main()
