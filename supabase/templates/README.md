# Auth email templates (SinDescuadre)

HTML for Supabase Auth mailers. Brand: navy `#1c2740`, gold `#c4a574`, cream canvas.

| File | Auth flow |
| --- | --- |
| `confirmation.html` | Confirm sign up |
| `recovery.html` | Reset password |
| `magic_link.html` | Magic link / OTP |
| `invite.html` | Invite user |
| `email_change.html` | Confirm new email |

## Local

Wired in `supabase/config.toml` under `[auth.email.template.*]`. After edits:

```bash
npx supabase stop && npx supabase start
```

Preview outbound mail at the local Inbucket URL from `npx supabase status`.

## Hosted (Dashboard)

1. Open **Authentication → Email Templates** for the project.
2. Paste each subject + HTML body from these files.
3. Keep Go template vars: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .Token }}`, `{{ .NewEmail }}`, etc.

Or Management API (`mailer_subjects_*` / `mailer_templates_*_content`) with a personal access token.
