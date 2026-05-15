# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # ESLint (zero warnings allowed)
npm run preview   # Preview production build
node server.js    # Start Socket.io server on port 5000
```

## Architecture

React 18 + Vite SPA — a JavaScript/ES6 programming assistant powered by Google Gemini AI.

**Entry:** `index.html` → `main.jsx` → `App.jsx` → `NavBar` + `Chat`

### Key Files

- **`src/components/Chat/Chat.jsx`** — Core chat UI. Manages `chatHistory` (persisted to localStorage), sends multi-turn conversations to Gemini, and dynamically injects copy-to-clipboard buttons into code blocks rendered by `react-markdown`.
- **`src/components/NavBar/NavBar.jsx`** — Google OAuth login/logout, user profile display, and theme toggle.
- **`src/hooks/useTheme.jsx`** — Light/dark theme via `data-theme` attribute on `document.body`, persisted to localStorage.
- **`server.js`** — Express + Socket.io server (port 5000). Currently scaffolded but not actively used by the frontend Chat component.

### Gemini AI Integration

- SDK: `@google/generative-ai` — initialized with `import.meta.env.VITE_API_KEY`
- Model: `gemini-2.5-flash` in multi-turn chat mode
- Config: `maxOutputTokens: 8192`, `temperature: 0.4`, `topP: 0.1`, `topK: 16`
- The system prompt (embedded in the first chat message, written in Spanish) scopes the assistant to JS/ES6 topics and references MDN, LenguajeJS, DevDocs, and W3Schools

### State Management

No external state library. All state is local React (`useState`/`useRef`):
- `chatHistory` — stored in and rehydrated from `localStorage`
- `profile` — Google OAuth user info, also persisted to `localStorage`
- `preferredDarkMode` — theme preference in `localStorage`

### Auth

`@react-oauth/google` — Google Client ID is hardcoded in `main.jsx`. After login, the user's profile is fetched via Axios from the Google OAuth2 v1 userinfo endpoint using the Bearer token.

### Styling

Component-scoped CSS files alongside each component. Global CSS variables (light/dark palette) live in `src/styles/vars.css`.
