# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Production build → /dist
npm run lint      # ESLint — zero warnings allowed
npm run preview   # Preview production build

# ADK backend (chat-tutors/)
cd chat-tutors
agents-cli install                                         # Install Python deps
uv run uvicorn app.fast_api_app:app --reload --port 8000   # Start dev server
agents-cli playground                                      # Interactive ADK web UI
agents-cli lint                                            # Lint Python code
agents-cli deploy                                          # Deploy to Cloud Run (requires GCP auth)

# Legacy (kept for rollback only)
supabase functions deploy chat   # Old Supabase Edge Function — superseded by ADK
```

## Architecture

React 18 + Vite SPA — a multi-session, multi-agent programming tutor powered by Google Gemini AI and Supabase.

**Entry:** `index.html` → `main.jsx` → `App.jsx` → `AppProvider` → `AppLayout` → `Sidebar` + `NavBar` + `Chat`

---

## Multi-Agent System (Google ADK)

The backend is a **real Google ADK project** in `chat-tutors/`, replacing the old Supabase Edge Function.

```
chat-tutors/app/agent.py          # TutorOrchestrator(BaseAgent) + 6 LlmAgent specialists + validator
chat-tutors/app/fast_api_app.py   # FastAPI: ADK playground + custom POST /chat endpoint
```

Start the ADK server: `cd chat-tutors && uv run uvicorn app.fast_api_app:app --reload`

### ADK Patterns in use

| Pattern | Implementation |
|---------|----------------|
| **BaseAgent router** | `TutorOrchestrator._run_async_impl` reads `agentId` from session state, routes to specialist |
| **LlmAgent specialists** | 6 `Agent` instances with isolated `instruction`, `generate_content_config`, `before_model_callback` |
| **History injection** | `inject_history` callback prepends Supabase history into `LlmRequest.contents` before each model call |
| **Sequential validation** | After specialist runs, `_validate_code()` checks code blocks via direct Gemini call (non-fatal) |
| **Persistent State** | `agent_id` stored in Supabase `chats` table; passed as `state` on session creation |

### Agent Registry

- **Frontend** `src/config/agents.js` — display info ONLY (name, icon, color, specialty). No system prompts.
- **Backend (canonical)** `chat-tutors/app/agent.py` — `_SYSTEM_PROMPTS` + `_MODEL_CONFIGS` (single source of truth)

| ID | Name | Domain | temperature |
|----|------|--------|-------------|
| `js-core` | Alex | JavaScript ES6+, closures, DOM, array methods | 0.4 |
| `typescript` | Tyler | TypeScript, types, generics, decorators | 0.3 |
| `async-js` | Sam | Promises, async/await, Event Loop, Workers | 0.4 |
| `react` | Maya | React hooks, Context, state, performance | 0.4 |
| `node-backend` | Noel | Node.js, Express, REST APIs, auth, databases | 0.4 |
| `algorithms` | Vera | DSA, Big O, recursion, dynamic programming | 0.5 |

Default agent when none is specified: `js-core`.

### POST /chat (ADK endpoint)

Request: `{ message, agentId, history[], generateTitle? }`
Response: `{ response, agentId, title? }`

- `agentId` is stored in session state → orchestrator routes to the right specialist
- `history` is injected into `LlmRequest.contents` via `inject_history` callback
- Validator runs on code blocks (non-fatal — failure returns specialist response as-is)
- `generateTitle: true` → backend generates title inline and returns it in `title`

---

## File Structure

```
src/
├── config/
│   └── agents.js                   # Agent registry (source of truth for frontend)
├── context/
│   └── AppContext.jsx              # Global state: chats, activeChatId, showTutorPicker, auth
├── hooks/
│   └── useTheme.jsx                # Light/dark theme, persisted to localStorage
├── lib/
│   └── supabase.js                 # Supabase client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── services/
│   ├── chatService.js              # CRUD for chats table; createChat accepts agentId
│   └── profileService.js           # upsertProfile — links Google OAuth user to Supabase profile
├── components/
│   ├── Chat/Chat.jsx               # Core chat UI; reads agentId from active chat, passes to Edge Function
│   ├── NavBar/NavBar.jsx           # Google + GitHub OAuth login, theme toggle
│   ├── Sidebar/Sidebar.jsx         # Chat list with TutorBadge per chat; "+" opens TutorPicker
│   ├── TutorPicker/
│   │   ├── TutorPicker.jsx         # Modal: grid of 6 agent cards; calls handleNewChat(agentId)
│   │   └── TutorPicker.style.css
│   ├── TutorBadge/
│   │   └── TutorBadge.jsx          # Small emoji+color indicator for a given agentId
│   ├── Loading/Loading.jsx
│   ├── Switch/Switch.jsx           # Theme toggle button
│   └── ErrorBoundary.jsx
├── styles/
│   └── vars.css                    # CSS custom properties — light/dark palette
└── App.jsx                         # AppLayout: renders Sidebar, NavBar, Chat, TutorPicker modal
supabase/
└── functions/
    └── chat/
        └── index.ts               # Deno Edge Function: agent routing, specialist execution, validator chain
```

---

## Key Data Flows

### Creating a new chat
```
Sidebar "+" button
  → setShowTutorPicker(true)           # AppContext
  → TutorPicker modal renders (App.jsx)
  → user selects agent card
  → handleNewChat(agentId)             # AppContext
  → createChat(profileId, agentId)     # chatService — inserts with agent_id
  → setActiveChatId(chat.id)
  → TutorPicker closes
```

### Sending a message
```
Chat.jsx handleSubmit
  → agentId = chats.find(activeChatId)?.agent_id ?? "js-core"
  → supabase.functions.invoke("chat", { message, history, agentId })
  → Edge Function: load agent config → startChat with isolated systemPrompt
  → specialist response
  → if response has code blocks → validator agent (non-fatal chain)
  → return { response, agentId }
  → updateChatHistory(chatId, finalHistory)   # persist to Supabase
  → auto-generate title on first message (mode: "title")
```

### Message format (stored in chats.history JSON array)
```javascript
{ id: UUID, role: "user" | "model", parts: string }
```

---

## Database Schema (Supabase PostgreSQL)

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID | Supabase Auth user ID |
| `email` | text | |
| `name` | text | |
| `picture` | text | Avatar URL |
| `google_id` | text | Links chats across logins |
| `updated_at` | timestamp | |

### `chats`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `profile_id` | UUID FK | → profiles.id |
| `title` | text | Auto-generated after first message |
| `history` | JSONB | Array of `{ id, role, parts }` |
| `agent_id` | text | DEFAULT `'js-core'` — which tutor this chat uses |
| `created_at` | timestamp | |
| `updated_at` | timestamp | Bumped on every message; used for sidebar ordering |

**Required migration** (run once in Supabase SQL Editor):
```sql
ALTER TABLE chats ADD COLUMN IF NOT EXISTS agent_id TEXT DEFAULT 'js-core';
```

RLS is enabled on both tables. All queries run with the user's auth token via the Supabase client.

---

## State Management (AppContext)

No external library. `AppContext.jsx` manages all global state via `useState` + `useMemo`.

| State | Type | Purpose |
|-------|------|---------|
| `supabaseProfile` | object | DB profile record |
| `googleProfile` | object | `{ id, name, email, picture, given_name }` |
| `chats` | array | `{ id, title, agent_id, created_at, updated_at }` — ordered by `updated_at DESC` |
| `activeChatId` | string\|null | Currently open chat |
| `sidebarOpen` | boolean | Mobile sidebar toggle |
| `showTutorPicker` | boolean | Controls TutorPicker modal visibility |

Key callbacks: `handleNewChat(agentId)`, `handleDeleteChat(chatId)`, `updateChatTitleInList(chatId, title)`, `refreshChatTimestamp(chatId)`.

---

## Auth

Supabase Auth with Google and GitHub OAuth providers. `onAuthStateChange` listener in `AppContext` handles session lifecycle:
- **Login**: extract `user_metadata` → `upsertProfile()` → `loadChats()`
- **Logout**: clear all state

`profileService.upsertProfile` links by `google_id` first to preserve existing chats across re-logins.

---

## Gemini AI Integration

- **SDK**: `google-adk` (Python) + `google-genai` — ADK backend only
- **Model**: `gemini-2.5-flash` for all modes (specialists + validator + title generation)
- **Multi-turn**: history from Supabase injected into `LlmRequest.contents` via `inject_history` callback
- **No client-side AI calls** — all AI requests go through `POST /chat` on the ADK FastAPI server

---

## Styling

Component-scoped CSS alongside each component. Global design tokens in `src/styles/vars.css`:
- Light/dark palette via `[data-theme="dark"]` selector on `document.body`
- Key variables: `--bg`, `--bg-surface`, `--bg-elevated`, `--accent`, `--border`, `--radius-md`, `--font-sans`, `--font-mono`
- Agent card colors are injected as CSS custom properties: `--agent-color`, `--agent-color-text`

---

## Environment Variables

### Frontend (`.env`)
| Variable | Notes |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_ADK_URL` | ADK server URL — `http://localhost:8000` for local dev |

### ADK backend (`chat-tutors/.env`)
| Variable | Notes |
|----------|-------|
| `GOOGLE_API_KEY` | Gemini AI Studio key (local dev, `GOOGLE_GENAI_USE_VERTEXAI=False`) |
| `GOOGLE_GENAI_USE_VERTEXAI` | `True` for Cloud Run / Vertex AI prod |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (Vertex AI mode only) |
| `SUPABASE_URL` | Supabase project URL (JWT validation) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ALLOW_ORIGINS` | Comma-separated CORS origins |

---

## Adding a New Agent

1. Add entry to `_SYSTEM_PROMPTS` and `_MODEL_CONFIGS` in `chat-tutors/app/agent.py`
2. Add the new ID to `_AGENT_IDS` list in `chat-tutors/app/agent.py`
3. Add display entry (id, name, icon, color, specialty) to `src/config/agents.js`
4. Restart the ADK server — no deploy needed for local dev
5. The TutorPicker grid renders automatically from `AGENTS_LIST`
