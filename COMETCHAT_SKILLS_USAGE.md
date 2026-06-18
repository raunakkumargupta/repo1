# CometChat Skills Usage

This document explains how the **CometChat Skills** (the `.claude/skills/cometchat*` packs) were used to drive the Step 2 integration, what each skill contributed, the prompts/workflows used, problems they solved, and the manual changes that were still required.

## Skills Used

| Skill | What it provided | Where it shaped the code |
|---|---|---|
| `cometchat` (dispatcher) | Framework detection, routing to web skills, overall integration flow | Confirmed Next.js (App Router) + identified the web UI Kit family |
| `cometchat-core` | Init + login patterns, StrictMode guards, env-var rules, error handling, SSR notes | `CometChatProvider.tsx` (module-level init guard + `loginInFlight` promise guard) |
| `cometchat-components` | Authoritative catalog of v6 component names and props | `ChatModal.tsx` / `TeamGroupChat.tsx` use the verified `CometChatMessageHeader` + `CometChatMessageList` + `CometChatMessageComposer` trio with `user` / `group` props |
| `cometchat-nextjs-patterns` | Next.js SSR prevention, the `dynamic({ ssr:false })`-in-Client-Component rule | Both chat pages import chat components via `next/dynamic` with `ssr:false` |
| `cometchat-features` | Feature tiers — which features need code vs dashboard toggles; AI feature + moderation enablement | Decided Smart Replies / Translation / Moderation are dashboard-toggled (no fabricated props); webhook used for moderation surfacing |
| `cometchat-production` (referenced) | Server-side auth-token minting recipe | Documented as the production upgrade path from dev-mode Auth Key login |

## Key Problems Solved Using the Skills

### 1. Avoided the StrictMode login race
`cometchat-core` explicitly documents the `"Please wait until the previous login request ends"` error caused by concurrent `login()` calls under React StrictMode. The skill's `ensureLoggedIn` in-flight-promise pattern was adopted directly in `CometChatProvider.tsx`, instead of a naive boolean flag.

**Before (naive, buggy):**
```ts
useEffect(() => { CometChatUIKit.login(uid); }, []); // double-fires in StrictMode
```
**After (skill pattern):**
```ts
let loginInFlight: Promise<unknown> | null = null;
async function ensureLoggedIn(uid: string) {
  const existing = await CometChatUIKit.getLoggedinUser();
  if (existing) return;
  if (loginInFlight) { await loginInFlight; return; }
  loginInFlight = CometChatUIKit.login(uid);
  try { await loginInFlight; } finally { loginInFlight = null; }
}
```

### 2. Prevented the Next.js 16 SSR build crash
`cometchat-nextjs-patterns` warns that the UI Kit accesses `window`/`document` at import time, and that in Next.js 15+ `dynamic({ ssr:false })` must live in a Client Component. This stopped a `window is not defined` build failure before it happened — the chat components are dynamically imported with `ssr:false` from the already-`"use client"` pages.

### 3. Did NOT invent component props for AI features
`cometchat-features` clarifies that Smart Replies and Message Translation in v6 are **dashboard-toggle / auto-wired** features — there is no `enableSmartReplies` prop on the composer. The skill's anti-hand-roll guidance kept us from fabricating props. Instead we documented the dashboard/CLI enablement and rely on the kit auto-rendering them.

### 4. Chose Rules Management over legacy moderation extensions
`cometchat-features` flags the legacy moderation extensions (Profanity Filter, Sentiment Analysis, etc.) as deprecated and warns against running them alongside Rules Management (double-processing). We chose **Rules Management** + a **webhook** to log flagged messages, which is the recommended modern path.

## Prompts / Workflow Used

The integration was executed as a single architect-led sequence:
1. "Detect framework and map the project" → confirmed Next.js App Router + Go backend.
2. "Initialize the SDK in a provider with dark-mode aesthetic" → `CometChatProvider.tsx`.
3. "Sync users on registration and groups on team creation via REST" → `cometchat_service.go` + hooks in `auth_service.go` / `team_service.go`.
4. "Embed 1-on-1 chat on find-team and group chat on project page" → `ChatModal` / `TeamGroupChat`.
5. "Add a moderation webhook that logs to the DB for the SuperAdmin" → `cometchat_webhook_handler.go` + `moderation_logs` migration.

## Feature Enablement Commands (dashboard / CLI)

```bash
# Smart Replies (AI) — needs an OpenAI key once
cometchat apply-feature smart-replies --openai-key sk-...

# Message Translation (extension)
cometchat apply-feature message-translation

# Moderation — configure Rules in Dashboard → Moderation → Settings → Rules
# (keyword/toxicity rules auto-apply; flagged messages fire the webhook)
```

## Limitations / Manual Changes Required

- **Dashboard steps are not automatable by code.** Smart Replies, Translation, Moderation Rules, and the webhook URL must be enabled in the CometChat dashboard (or via the CLI with credentials). The code is ready; the toggles are an operator action.
- **Auth Key (dev mode) vs auth tokens.** We log in with the Auth Key for staging. Production should mint auth tokens server-side (see `cometchat-production`). This is a documented, deliberate trade-off, not an oversight.
- **Seeded-user backfill is a one-time manual trigger.** The `POST /api/admin/cometchat/sync-users` endpoint must be invoked once to backfill the 100+ pre-existing users.
- **REST API shapes** were taken from the standard CometChat v3 REST API; field names (e.g. moderation result payload) may need minor adjustment to match the exact webhook payload your app version emits.

## Learnings

- The skills' biggest value was **negative knowledge** — telling us what *not* to do (don't invent props, don't run legacy + Rules moderation, don't put `ssr:false` dynamic in a Server Component, don't use a boolean login guard). This prevented several subtle, hard-to-debug failures.
- Using `user_id` as the CometChat `UID` and `team_id` as the group `GUID` (a shared-identity model) removed an entire class of mapping/sync bugs.
