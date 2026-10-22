<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:feature-harnesses -->
# Feature harnesses

When implementing **Accounts (cuentas)**, follow the project skill `.cursor/skills/accounts-module/SKILL.md` and rule `.cursor/rules/accounts-module.mdc`. Product source of truth: `docs/product/features/accounts/` and `docs/decisions/ADR-0006-accounts-vs-funds.md`.

When implementing **Guidance (IA contextual V1)**, follow the project skill `.cursor/skills/guidance-module/SKILL.md` and rule `.cursor/rules/guidance-module.mdc`. Product source of truth: `docs/product/features/guidance/` and `docs/decisions/ADR-0008-contextual-guidance-v1.md`. Dashboard stays uncluttered: modal + `/guidance` only; no LLM in V1.

When implementing **Recommendations (persistentes + IA)**, follow the project skill `.cursor/skills/recommendations-module/SKILL.md` and rule `.cursor/rules/recommendations-module.mdc`. Product source of truth: `docs/product/features/recommendations/` and `docs/decisions/ADR-0009-persistent-recommendations-ai.md`. Rules pick candidates; LLM only drafts CARE copy; soft notice outside dashboard scroll; no chat; balances mes/periodo in later phases.
<!-- END:feature-harnesses -->
