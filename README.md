# Cursi

> AI for your entire desktop — a lightweight floating panel that appears wherever your cursor is.

Cursi is a macOS desktop app built with Electron. Press a global shortcut, copy any text first if you want context, and an AI panel pops up right next to your cursor. Chat, get answers, summarise, translate — then it disappears. No window switching, no context loss.

---

## Features

- **Global shortcut** — `⌘ ⇧ Space` summons the panel from any app
- **Clipboard context** — copy text before triggering; Cursi reads it automatically and offers instant actions (Summarise, Fix grammar, Explain simply, Translate)
- **Streaming responses** — tokens arrive in real time via Server-Sent Events
- **Conversation memory** — sessions persist; re-opening with no new clipboard resumes the last chat
- **Frameless floating panel** — frosted-glass look, always on top, auto-positions near your cursor and stays inside the display work area
- **Tray icon** — quick access and settings without a Dock entry
- **Auth** — Supabase email/password auth; JWT validated server-side
- **Secure architecture** — AI credentials live only on the API server, never in the desktop app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 33, electron-vite, React 18, Tailwind CSS 3, Zustand |
| API | Fastify 5, Drizzle ORM, PostgreSQL (Supabase) |
| AI | Streaming LLM (via API server) |
| Auth | Supabase Auth (JWT) |
| Shared | TypeScript package (`@cursi/shared`) — types, Zod schemas, constants |
| Monorepo | pnpm workspaces + Turborepo |

---

## Project Structure

```
cursi/
├── apps/
│   ├── desktop/               # Electron app
│   │   └── src/
│   │       ├── main/          # Main process
│   │       │   ├── index.ts           # App entry, lifecycle
│   │       │   ├── windows.ts         # BrowserWindow creation & positioning
│   │       │   ├── shortcuts.ts       # Global shortcut registration
│   │       │   ├── ipc.ts             # IPC handlers (hide, show, resize, context)
│   │       │   ├── context-engine.ts  # Clipboard context gathering
│   │       │   ├── tray.ts            # System tray icon & menu
│   │       │   └── app-lifecycle.ts   # Quit/activate behaviour
│   │       ├── preload/       # Context bridge (window.desktop API)
│   │       └── renderer/      # React UI
│   │           ├── pages/     # ChatPage, SettingsPage
│   │           ├── components/# ChatInput, MessageList, ContextBadge
│   │           ├── hooks/     # useChat, usePanelResize
│   │           └── stores/    # authStore, chatStore (Zustand)
│   └── api/                   # Fastify backend
│       └── src/
│           ├── server.ts      # Fastify setup, plugins, routes
│           ├── middleware/    # auth (JWT), rate-limit
│           ├── routes/        # chat, conversations, users
│           ├── services/      # chat.service, conversation.service, LLM layer
│           └── db/            # Drizzle schema (users, conversations, messages)
└── packages/
    └── shared/                # @cursi/shared — types, Zod schemas, constants
```

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- A **Supabase** project (for auth + PostgreSQL)
- An **AI provider** API key (configured on the API server)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/cursi.git
cd cursi
pnpm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

**Root `.env`** (used by both apps in dev):

```env
# API
PORT=3001
DATABASE_URL=postgresql://...          # Supabase Postgres connection string
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
AI_API_KEY=your-api-key
AI_MODEL=your-model

# Desktop renderer
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

> ⚠️ **Never put your AI API key in the desktop app.** It belongs on the API server only.

### 3. Run database migrations

```bash
pnpm --filter @cursi/api db:migrate
```

### 4. Start development

```bash
pnpm dev          # starts both API and desktop concurrently via Turborepo
```

Or run them separately:

```bash
pnpm dev:api      # Fastify API on port 3001
pnpm dev:desktop  # Electron app with HMR
```

---

## How It Works

1. **Shortcut fires** (`⌘ ⇧ Space`) — the Electron main process captures cursor coordinates, reads the clipboard, then shows the floating panel positioned near the cursor.
2. **Context push** — main sends the clipboard context to the renderer via IPC (`shortcut:triggered`).
3. **User types a message** — the renderer sends a `POST /v1/chat` request to the Fastify API with the message, optional clipboard context, and a conversation ID.
4. **API streams** — the API authenticates the JWT, calls the configured LLM with a streaming chat completion, and pipes tokens back as Server-Sent Events.
5. **Panel resizes** — the renderer measures its content height and calls `panel:resize` IPC to dynamically resize the `BrowserWindow` (clamped between 52 px and 380 px), then repositions near the cursor.
6. **Dismiss** — pressing `Esc`, clicking outside (blur), or pressing the shortcut again hides the panel.

---

## Building for Production

```bash
pnpm build               # build all packages
pnpm --filter @cursi/desktop dist:mac   # package as .dmg for macOS (arm64 + x64)
```

The `.dmg` and `.zip` are output to `apps/desktop/dist/`.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm dev:api` | Start the API only |
| `pnpm dev:desktop` | Start the desktop app only |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm clean` | Delete all build artifacts and `node_modules` |
| `pnpm --filter @cursi/api db:migrate` | Run database migrations |
| `pnpm --filter @cursi/api db:studio` | Open Drizzle Studio |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/v1/chat` | Send a message; streams SSE response |
| `GET` | `/v1/conversations` | List conversations for the authenticated user |
| `GET` | `/v1/conversations/:id` | Get a conversation with its messages |
| `DELETE` | `/v1/conversations/:id` | Delete a conversation |
| `GET` | `/v1/users/me` | Get the current user profile |

All routes except `/health` require a `Authorization: Bearer <supabase-jwt>` header.

---

## Global Shortcut

The default shortcut is `⌘ ⇧ Space`. You can change it in the Settings page inside the app — the new shortcut is registered immediately and persisted via `electron-store`.

---

## License

MIT
