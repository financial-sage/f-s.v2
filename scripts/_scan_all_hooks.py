import os
import re

# Reuse logic from _scan_dash_hooks.py across all tsx
ROOT = "src"


def scan_file(path: str) -> None:
    text = open(path, encoding="utf-8").read()
    for m in re.finditer(
        r"(?:export\s+default\s+function|export\s+function|function)\s+(\w+)\s*\([^)]*\)\s*\{",
        text,
    ):
        name = m.group(1)
        start = m.end() - 1
        depth = 0
        end = None
        for j, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = j
                    break
        if end is None:
            continue
        body = text[start + 1 : end]
        depth = 0
        i = 0
        n = len(body)
        events = []
        while i < n:
            ch = body[i]
            if ch in "\"'":
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
            if ch == "`":
                i += 1
                while i < n:
                    if body[i] == "\\":
                        i += 2
                        continue
                    if body[i] == "`":
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
            if ch == "{":
                depth += 1
                i += 1
                continue
            if ch == "}":
                depth -= 1
                i += 1
                continue
            if depth == 0:
                line_start = body.rfind("\n", 0, i) + 1
                if i == line_start or body[line_start:i].strip() == "":
                    rest = body[i : i + 140]
                    line_no = text[: start + 1 + i].count("\n") + 1
                    hm = re.match(
                        r"(?:const|let)\s+[^=]+=\s*(?:React\.)?(use[A-Z]\w*)",
                        rest,
                    )
                    hm2 = re.match(
                        r"(?:React\.)?(use(?:Effect|LayoutEffect|InsertionEffect))\s*\(",
                        rest,
                    )
                    hm3 = re.match(r"if\s*\([^)]+\)\s*return\b", rest)
                    hm4 = re.match(r"return\b", rest)
                    if hm:
                        events.append((line_no, "HOOK", hm.group(1), rest.split("\n")[0][:100]))
                    elif hm2:
                        events.append(
                            (line_no, "HOOK", hm2.group(1), rest.split("\n")[0][:100])
                        )
                    elif hm3:
                        events.append((line_no, "IFRET", None, rest.split("\n")[0][:100]))
                    elif hm4:
                        events.append((line_no, "RET", None, rest.split("\n")[0][:100]))
            i += 1

        hooks = [e for e in events if e[1] == "HOOK"]
        if len(hooks) < 2:
            continue
        last_hook = hooks[-1][0]
        bad = [e for e in events if e[1] in ("IFRET", "RET") and e[0] < last_hook]
        if bad:
            print(f"BUG {path}::{name}")
            for e in bad:
                print(f"  early L{e[0]} {e[1]} {e[3]}")
            after = [h for h in hooks if h[0] > bad[0][0]]
            for h in after[:8]:
                print(f"  later hook L{h[0]} {h[2]}")


def main() -> None:
    for dp, _, fs in os.walk(ROOT):
        for f in fs:
            if f.endswith(".tsx"):
                scan_file(os.path.join(dp, f))
    print("done")


if __name__ == "__main__":
    main()
