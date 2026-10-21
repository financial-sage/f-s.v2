"""One-shot: enable Google OAuth on the linked Supabase project via Management API.

Reads the Supabase CLI access token from Windows Credential Manager.
Expects GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.
Does not print secrets.
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes as w
import json
import os
import sys
import urllib.error
import urllib.request
from ctypes import POINTER, Structure, byref, c_void_p, c_wchar_p

PROJECT_REF = "ovpeumhwyfrfbbrspsrs"


class CREDENTIAL(Structure):
    _fields_ = [
        ("Flags", w.DWORD),
        ("Type", w.DWORD),
        ("TargetName", c_wchar_p),
        ("Comment", c_wchar_p),
        ("LastWritten", w.FILETIME),
        ("CredentialBlobSize", w.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_byte)),
        ("Persist", w.DWORD),
        ("AttributeCount", w.DWORD),
        ("Attributes", c_void_p),
        ("TargetAlias", c_wchar_p),
        ("UserName", c_wchar_p),
    ]


def read_cli_token() -> str:
    adv = ctypes.WinDLL("advapi32", use_last_error=True)
    cred_ptr = POINTER(CREDENTIAL)()
    ok = adv.CredReadW("Supabase CLI:supabase", 1, 0, byref(cred_ptr))
    if not ok:
        raise RuntimeError(f"CredRead failed: {ctypes.get_last_error()}")
    try:
        blob = ctypes.string_at(
            cred_ptr.contents.CredentialBlob, cred_ptr.contents.CredentialBlobSize
        )
        return blob.decode("utf-8").rstrip("\x00")
    finally:
        adv.CredFree(cred_ptr)


def api(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.supabase.com{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "sindescuadre-oauth-setup",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {exc.code}: {detail[:500]}") from exc


def main() -> int:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET", file=sys.stderr)
        return 1

    token = read_cli_token()

    # Keep existing production redirects and add local + callback URLs.
    current = api("GET", f"/v1/projects/{PROJECT_REF}/config/auth", token)
    existing = current.get("uri_allow_list") or current.get("additional_redirect_urls") or ""
    if isinstance(existing, list):
        redirects = [str(x).strip() for x in existing if str(x).strip()]
    else:
        redirects = [x.strip() for x in str(existing).split(",") if x.strip()]

    needed = [
        "https://sindescuadre.es",
        "https://sindescuadre.es/auth/callback",
        "http://localhost:3000",
        "http://localhost:3000/auth/callback",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3000/auth/callback",
    ]
    for url in needed:
        if url not in redirects:
            redirects.append(url)

    payload = {
        "external_google_enabled": True,
        "external_google_client_id": client_id,
        "external_google_secret": client_secret,
        "external_google_skip_nonce_check": True,
        "uri_allow_list": ",".join(redirects),
    }

    updated = api("PATCH", f"/v1/projects/{PROJECT_REF}/config/auth", token, payload)
    enabled = bool(updated.get("external_google_enabled"))
    has_client = bool(updated.get("external_google_client_id"))
    print(
        json.dumps(
            {
                "ok": enabled and has_client,
                "external_google_enabled": enabled,
                "client_id_set": has_client,
                "site_url": updated.get("site_url"),
                "uri_allow_list": updated.get("uri_allow_list"),
            },
            indent=2,
        )
    )
    return 0 if enabled and has_client else 2


if __name__ == "__main__":
    raise SystemExit(main())
