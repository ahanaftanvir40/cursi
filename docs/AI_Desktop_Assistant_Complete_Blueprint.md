# AI Desktop Assistant --- Complete Blueprint

## Product vision

A system-wide AI assistant for the desktop. The user presses a
configurable global shortcut from any supported application, a floating
AI panel appears, and the AI can use the current context.

Core interaction:

**Shortcut → Context → AI → Answer**

Initial experience:

``` text
Chrome / Slack / VS Code / Mail / Figma / PDF / other apps
                    ↓
            Select text
                    ↓
          Cmd + Shift + Space
                    ↓
            Floating AI panel
                    ↓
       Selected text becomes context
                    ↓
              Ask anything
                    ↓
            Streaming response
```

Long-term positioning:

> **Cursor for the entire desktop.**

The product should evolve from chat to context awareness, screen
understanding, application awareness, and eventually approved actions.

------------------------------------------------------------------------

## MVP goal

Prove this loop:

1.  User is in any macOS application.
2.  User presses a global shortcut.
3.  The AI panel opens quickly.
4.  Selected text can optionally be carried into the conversation.
5.  The user asks a question.
6.  The backend sends the request to an LLM.
7.  The response streams back.
8.  `Esc` dismisses the panel.

### MVP success criteria

-   Runs quietly in the macOS menu bar/background.
-   Global shortcut works while another application has focus.
-   AI panel opens quickly and focuses its input.
-   Normal chat works without context.
-   Selected text can be captured as context.
-   LLM responses stream.
-   Conversations are persisted.
-   LLM credentials never ship in the desktop app.
-   The app can be packaged for macOS.

------------------------------------------------------------------------

## MVP features

  ----------------------------------------------------------------------------
  Feature                 Priority                Notes
  ----------------------- ----------------------- ----------------------------
  Global keyboard         MVP                     Configurable;
  shortcut                                        e.g. `Cmd + Shift + Space`

  Floating AI window      MVP                     Frameless utility-style
                                                  panel

  Chat                    MVP                     Text input + messages

  Streaming               MVP                     SSE or HTTP streaming

  Selected text context   MVP                     Clipboard-first
                                                  implementation

  Conversation history    MVP                     PostgreSQL

  Authentication          MVP                     Supabase Auth or equivalent

  Menu bar/tray           MVP                     Ask, settings, quit

  Launch at login         Recommended             Always available

  Shortcut customization  Recommended             Avoid conflicts

  Screen understanding    Later                   ScreenCaptureKit + vision

  Accessibility context   Later                   macOS Accessibility APIs

  Actions/agents          Later                   Not first MVP
  ----------------------------------------------------------------------------

------------------------------------------------------------------------

## System-wide architecture

This is **not a Chrome extension**. Chrome is only one environment.

``` text
                         macOS
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
      Chrome             Slack             VS Code
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    Global Shortcut
                           │
                           ▼
              ┌────────────────────────┐
              │    Electron Desktop    │
              │                        │
              │ Global Shortcut        │
              │ Context Engine         │
              │ Window Manager         │
              │ Menu Bar / Tray        │
              │ App Lifecycle          │
              │ IPC                    │
              └────────────┬───────────┘
                           │
                       HTTPS/stream
                           │
                           ▼
              ┌────────────────────────┐
              │     Backend API        │
              │                        │
              │ Auth → Validation      │
              │ → Chat → LLM           │
              │ → Persistence          │
              └──────────┬─────────────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
             PostgreSQL      LLM Provider
             / Supabase      OpenAI first
```

The uploaded architecture document uses this same Electron + React +
TypeScript + Fastify + PostgreSQL/Supabase + OpenAI foundation.

------------------------------------------------------------------------

## Recommended technology stack

  Layer        Technology             Reason
  ------------ ---------------------- ------------------------------------
  Desktop      Electron               Desktop shell + native integration
  Language     TypeScript             Shared language
  UI           React                  Fast iteration
  Styling      Tailwind CSS           Rapid UI development
  Build        Vite                   Fast renderer builds
  State        Zustand                Simple state
  Backend      Node.js + Fastify      Lightweight API
  Validation   Zod                    Runtime validation
  Database     PostgreSQL             Relational persistence
  Auth         Supabase Auth          Fast MVP auth
  ORM          Drizzle                Type-safe, lightweight
  AI           OpenAI initially       Simple first provider
  Streaming    SSE / HTTP streaming   Responsive UX
  Packaging    electron-builder       `.app`, `.dmg`, Windows builds
  Monorepo     pnpm + Turborepo       Shared packages
  Monitoring   Sentry                 Recommended after prototype
  Analytics    PostHog                Optional

------------------------------------------------------------------------

## Project structure

``` text
ai-desktop/
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts
│   │       │   ├── windows.ts
│   │       │   ├── shortcuts.ts
│   │       │   ├── tray.ts
│   │       │   ├── ipc.ts
│   │       │   └── app-lifecycle.ts
│   │       ├── preload/
│   │       │   ├── index.ts
│   │       │   └── api.ts
│   │       └── renderer/
│   │           ├── components/
│   │           ├── pages/
│   │           ├── hooks/
│   │           ├── stores/
│   │           ├── lib/
│   │           ├── App.tsx
│   │           └── main.tsx
│   └── api/
│       └── src/
│           ├── server.ts
│           ├── routes/
│           │   ├── auth.ts
│           │   ├── chat.ts
│           │   ├── conversations.ts
│           │   └── users.ts
│           ├── services/
│           │   ├── llm/
│           │   │   ├── openai.ts
│           │   │   └── llm.service.ts
│           │   ├── chat.service.ts
│           │   └── conversation.service.ts
│           ├── middleware/
│           │   ├── auth.ts
│           │   └── rate-limit.ts
│           └── db/
│               ├── client.ts
│               ├── schema.ts
│               └── migrations/
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── schemas/
│   │   └── constants/
│   └── config/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

------------------------------------------------------------------------

## Electron architecture

### Main process

Owns:

-   Global shortcuts
-   Window creation/positioning
-   Menu bar/tray
-   App lifecycle
-   IPC

### Preload

Expose a small explicit API.

Keep:

``` text
contextIsolation: true
nodeIntegration: false
```

Example:

``` ts
window.desktop = {
  hideWindow(),
  showWindow(),
  getAppInfo(),
  onShortcut()
}
```

### Renderer

React handles:

-   Chat
-   Messages
-   Context preview
-   Settings
-   Shortcut configuration
-   Local UI state

------------------------------------------------------------------------

## Global shortcut

``` text
User is in Chrome / VS Code / Slack
                ↓
        Cmd + Shift + Space
                ↓
          Electron Main
                ↓
         globalShortcut
                ↓
         gather context
                ↓
        show AI window
                ↓
        focus chat input
```

The shortcut must be configurable because another application may
already own the chosen combination.

------------------------------------------------------------------------

## Selected text from anywhere

Electron's global shortcut does **not** automatically provide selected
text from every other application.

### MVP: clipboard capture

Use a temporary copy/capture strategy:

``` text
Select text
    ↓
Shortcut
    ↓
Temporary copy
    ↓
Read clipboard
    ↓
AIContext.selectedText
    ↓
Chat request
    ↓
LLM
```

Restore the user's previous clipboard content as quickly as practical.

### Later: Accessibility APIs

A more robust implementation can use macOS Accessibility APIs to inspect
selected text and application UI where supported.

Test across:

-   Chrome
-   Safari
-   VS Code
-   Slack
-   Mail
-   Editors
-   PDF readers

Application behavior and permissions vary.

------------------------------------------------------------------------

## Context engine

Create a generic context layer from day one.

``` ts
interface AIContext {
  selectedText?: string;
  clipboardText?: string;

  activeApplication?: {
    name: string;
    bundleId: string;
  };

  currentUrl?: string;
  screenshot?: string;
  accessibilityData?: unknown;
}

interface ContextProvider {
  getContext(): Promise<AIContext>;
}
```

Future providers:

``` text
SelectedTextProvider
ClipboardProvider
ActiveAppProvider
ScreenProvider
BrowserProvider
AccessibilityProvider
```

This lets the product grow without coupling the chat system to one
context source.

------------------------------------------------------------------------

## Chat lifecycle

``` text
React ChatInput
      ↓
Desktop API client
      ↓
POST /v1/chat
      ↓
Auth middleware
      ↓
Zod validation
      ↓
Chat Service
      ↓
LLM Service
      ↓
OpenAI Provider
      ↓
Streaming response
      ↓
Backend → Electron → React
      ↓
Save completed messages
```

------------------------------------------------------------------------

## API

  Method   Endpoint                  Purpose
  -------- ------------------------- --------------------------------------------
  POST     `/v1/chat`                Send message + optional context and stream
  POST     `/v1/conversations`       Create conversation
  GET      `/v1/conversations`       List conversations
  GET      `/v1/conversations/:id`   Retrieve conversation
  DELETE   `/v1/conversations/:id`   Delete conversation
  GET      `/v1/users/me`            Get authenticated profile

Example:

``` json
{
  "conversationId": "abc123",
  "message": "Explain this simply",
  "context": {
    "type": "selected_text",
    "text": "The selected text..."
  }
}
```

------------------------------------------------------------------------

## LLM abstraction

Keep provider-specific code behind one interface.

``` ts
interface LLMProvider {
  streamChat(
    messages: Message[],
    options?: LLMOptions
  ): AsyncIterable<string>;
}
```

Initial:

``` text
LLMService
    ↓
OpenAIProvider
```

Future:

``` text
AnthropicProvider
GeminiProvider
```

Do not build multiple providers unless the MVP actually needs them.

------------------------------------------------------------------------

## Database

``` text
users
-----
id
email
created_at

conversations
-------------
id
user_id
title
created_at
updated_at

messages
--------
id
conversation_id
role
content
model
created_at
```

Relationship:

``` text
User
  ↓
many Conversations
  ↓
many Messages
```

Avoid vector databases, Redis, event buses, and microservices unless a
real requirement appears.

------------------------------------------------------------------------

## Authentication and secrets

``` text
Electron
   ↓
JWT / Session
   ↓
Backend
   ↓
Validate identity
   ↓
Authorize data
   ↓
Call LLM
```

**Never put the OpenAI API key in the Electron application.**

Keep provider credentials on the backend.

------------------------------------------------------------------------

## Electron security

Use:

``` text
contextIsolation: true
nodeIntegration: false
```

Also:

-   Narrow preload API
-   Validate IPC payloads
-   No arbitrary shell execution
-   Secure credential storage where appropriate
-   HTTPS
-   Rate limits
-   Request-size limits

------------------------------------------------------------------------

## macOS capabilities

  -----------------------------------------------------------------------
  Capability              Technology              Phase
  ----------------------- ----------------------- -----------------------
  Global shortcut         Electron                MVP
                          `globalShortcut`        

  Floating panel          Electron                MVP
                          `BrowserWindow` / macOS 
                          panel behavior          

  Selected text           Clipboard first;        MVP/V2
                          Accessibility later     

  Screen capture          ScreenCaptureKit        V2

  App UI inspection       Accessibility APIs      V2/V3

  Browser context         Browser integration     Later
  -----------------------------------------------------------------------

The uploaded architecture document recommends this progression.

------------------------------------------------------------------------

# Installation and distribution

## Your own Mac --- free

You can build and install the application on your own Mac without paying
for an Apple Developer membership.

Development:

``` text
Source code
    ↓
Electron
    ↓
Development / unsigned build
    ↓
Install/run on your Mac
```

You can also create an unsigned `.app` or `.dmg` for testing.

## Sharing with a friend

Yes, you can technically share an unsigned `.dmg`.

The flow can be:

``` text
Your Mac
   ↓
Build .dmg
   ↓
Send to friend
   ↓
Friend installs
```

The limitation is Gatekeeper. An unsigned app can trigger security
warnings or require the user to manually approve it.

This is reasonable for a small private alpha/beta.

## Public distribution

For a professional installation experience:

``` text
Electron
   ↓
.app / .dmg
   ↓
Code signing
   ↓
Hardened Runtime
   ↓
Notarization
   ↓
Distribution
```

You do not need the Mac App Store to distribute the application.

------------------------------------------------------------------------

# macOS Gatekeeper

The simplified distinction:

### Unsigned

``` text
Unsigned app
    ↓
Gatekeeper warning
    ↓
User may need manual approval
```

### Signed + notarized

``` text
Signed app
    ↓
Apple notarization
    ↓
Gatekeeper can verify it
    ↓
Much smoother installation
```

The statement that an unsigned app will *always* be refused is too
absolute. Unsigned apps can be run, but macOS may impose additional
security steps.

------------------------------------------------------------------------

# Hardened Runtime

Notarized macOS applications use Hardened Runtime.

Electron uses Chromium/V8 and may require Electron-specific code-signing
entitlements, including JIT-related permissions.

Common Electron-related entitlements include:

``` text
com.apple.security.cs.allow-jit
com.apple.security.cs.allow-unsigned-executable-memory
```

Do not blindly copy a large entitlement list. Configure entitlements
according to the Electron version and actual app requirements.

Also distinguish code-signing entitlements from user privacy permissions
such as:

-   Accessibility
-   Screen Recording
-   Microphone

------------------------------------------------------------------------

# macOS-specific behavior

macOS and Windows have different desktop conventions.

On macOS:

-   Closing a window does not necessarily quit the app.
-   `Cmd + Q` quits the app.
-   The application menu is integrated into the top system menu bar.
-   A menu-bar/background app can remain alive while its floating panel
    is hidden.
-   Login-at-startup and other native behaviors should be tested on
    signed production builds.

------------------------------------------------------------------------

# Windows support

Electron allows the same general application architecture to target
Windows.

Conceptually:

``` text
                Shared Electron App
                       │
                ┌──────┴──────┐
                ↓             ↓
              macOS        Windows
                ↓             ↓
              .dmg           .exe
```

Shared:

-   React UI
-   TypeScript
-   AI logic
-   Backend
-   Authentication
-   Conversations
-   Settings

Platform-specific:

``` text
macOS:
Accessibility
ScreenCaptureKit
macOS permissions

Windows:
Windows accessibility
Windows screen capture
Windows permissions
```

Use platform abstractions instead of spreading OS-specific code
throughout the application.

------------------------------------------------------------------------

# Build and packaging strategy

Recommended:

``` text
Electron
+
React
+
TypeScript
+
Vite
+
electron-builder
```

Targets:

``` text
macOS → .app / .dmg
Windows → .exe
```

You can develop primarily on your Mac and later use CI/CD such as GitHub
Actions for platform-specific builds.

------------------------------------------------------------------------

# Product positioning

The basic "AI chat with a shortcut" interaction is becoming crowded.

Avoid:

> "ChatGPT that opens anywhere."

Stronger:

> **The AI layer that understands whatever you're doing on your
> desktop.**

Or:

> **Cursor for the entire desktop.**

The competitive advantage should be:

**Context → Understanding → Action**

not merely an AI popup.

------------------------------------------------------------------------

# Product evolution

## V0.1

Global shortcut → floating chat → LLM

## V0.2

Selected text → automatic AI context

## V0.3

Clipboard + active application context

## V0.4

Screen understanding with vision models

## V1

Context-aware desktop assistant

## V2

Approved actions, integrations and agents

------------------------------------------------------------------------

# Interaction evolution

### V1

``` text
Select
  ↓
Shortcut
  ↓
Ask
  ↓
Answer
```

### V2

``` text
Select
  ↓
Shortcut
  ↓
Ask
  ↓
AI changes it
```

### V3

``` text
Shortcut
  ↓
AI sees screen
  ↓
AI understands context
```

### V4

``` text
Shortcut
  ↓
AI understands
  ↓
AI takes approved action
```

Ultimate principle:

> The user should not have to repeatedly explain context that the
> desktop can provide automatically.

------------------------------------------------------------------------

# Example long-term workflows

### Slack

``` text
Select message
      ↓
Shortcut
      ↓
"What should I reply?"
      ↓
AI drafts response
      ↓
Approved insertion
```

### VS Code

``` text
Select error/code
      ↓
Shortcut
      ↓
"Fix this"
      ↓
AI explains + generates fix
      ↓
Approved insertion
```

### Website

``` text
Shortcut
      ↓
Screen / browser context
      ↓
"Summarize this page"
```

### Email

``` text
Select email
      ↓
Shortcut
      ↓
"Write a concise response"
```

------------------------------------------------------------------------

# Monetization direction

A possible model:

## Free

-   Global shortcut
-   Floating AI overlay
-   Basic chat
-   Selected-text context
-   Limited requests
-   Basic model

## Pro --- roughly \$10--15/month

-   Higher usage
-   Better models
-   Screen understanding
-   Longer context
-   Memory
-   Advanced context
-   Actions/automation

## Power / Max

Potentially \$30--50+/month for:

-   Heavy usage
-   Advanced models
-   Agents
-   Automation
-   Large context
-   Priority

## BYOK

Support users who bring their own provider keys.

``` text
User API key
    ↓
Your app/backend
    ↓
LLM provider
```

This can reduce inference costs for BYOK users.

------------------------------------------------------------------------

# Difficulty

  Area                       Difficulty
  -------------------------- --------------
  Electron shell             Low
  Global shortcut            Low--Medium
  Floating panel             Low--Medium
  LLM integration            Low
  Streaming                  Low--Medium
  Auth + database            Medium
  Selected text              Medium
  Screen understanding       Medium--High
  Accessibility automation   High
  Agent actions              High

------------------------------------------------------------------------

# What not to build in the MVP

Avoid:

-   Multi-agent systems
-   RAG/vector database
-   Voice assistant
-   Complex memory
-   Computer-use automation
-   Browser automation
-   Dozens of app integrations
-   Windows/Linux in the first Mac MVP
-   Enterprise administration
-   Team collaboration
-   Multiple LLM vendors
-   Kubernetes/microservices

Focus on the interaction.

------------------------------------------------------------------------

# Recommended build order

1.  Create Electron + React + TypeScript project.
2.  Create floating/secondary AI `BrowserWindow`.
3.  Register global shortcut.
4.  Show/focus AI window.
5.  Add `Esc` to hide.
6.  Build minimal chat UI.
7.  Create Fastify backend.
8.  Add authentication.
9.  Create PostgreSQL schema.
10. Implement LLM provider service.
11. Implement streaming.
12. Persist conversations/messages.
13. Add selected-text context.
14. Add menu bar/tray.
15. Add shortcut customization.
16. Add launch-at-login.
17. Package and test macOS app.
18. Add signing/notarization when distributing publicly.
19. Add Windows build/CI later.

------------------------------------------------------------------------

# Practical first milestone

Do not start with screen understanding or agents.

Get these ten things working:

``` text
1. Electron launches
2. App runs in menu bar
3. Cmd + Shift + Space works globally
4. Floating window appears
5. Input is focused
6. User types prompt
7. Prompt reaches backend
8. Backend calls LLM
9. Response streams
10. Esc hides the window
```

Then:

``` text
11. Select text in another app
12. Press shortcut
13. Selected text becomes context
14. Ask "Explain this"
15. AI understands the selected text
```

If those two loops feel instant and reliable, the MVP foundation is
strong.

------------------------------------------------------------------------

# Naming direction

Because the concept is related to the cursor/pointer, potential names
explored include:

-   **Curso**
-   **Cursora**
-   **Hover**
-   **Caret**
-   **Pointa**
-   **Spot**
-   Cursorly
-   Veya
-   Luma
-   Kora
-   Nomi
-   Flux
-   Halo
-   Orbit

Strong cursor-oriented shortlist:

### Curso

Short, directly evokes "cursor," and does not restrict the product to
text editing.

Possible positioning:

> **Curso --- AI for your entire desktop.**

### Cursora

More explicitly connected to "Cursor" while sounding like a standalone
product.

### Hover

Represents AI appearing around wherever the user is working.

> **Hover --- AI that's always within reach.**

### Caret

A technical reference to the text insertion cursor.

> **Caret --- AI at the point of focus.**

### Pointa

Represents the point where the user is focused.

> **Pointa --- Point. Ask. Done.**

### Spot

Suggests AI being available wherever the user is working.

> **Spot --- Your AI, wherever you work.**

------------------------------------------------------------------------

# Final recommendation

Build the first production-capable MVP as:

**One Electron desktop application + one backend API.**

Desktop owns:

-   Experience
-   Global shortcut
-   Floating window
-   Menu bar
-   Context collection
-   macOS integration

Backend owns:

-   Authentication
-   Conversations
-   Usage controls
-   LLM calls
-   Provider credentials
-   Persistence

Keep two abstractions from day one:

``` text
Context Engine
LLM Provider
```

Keep their first implementations extremely small.

## Core product principle

> **Build the interaction before the infrastructure.**

The MVP wins if it feels instant:

``` text
shortcut
    ↓
context
    ↓
AI
    ↓
answer
```

Then expand:

``` text
context
    ↓
understanding
    ↓
generation
    ↓
action
```

The uploaded architecture source explicitly frames the core product
principle as building the interaction first and making the shortcut →
context → AI → answer experience feel instant.

------------------------------------------------------------------------

# One-sentence product definition

> **A system-wide AI layer that follows you across your desktop,
> understands what you're working on, and helps you instantly.**
