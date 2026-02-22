# TelegramCode

Telegram bot that relays messages to [Claude Code](https://github.com/anthropics/claude-code) CLI running on your machine. Control your coding projects remotely from your phone.

[한국어](#한국어)

---

## Features

- **Claude Code Integration** — Send plain text to request coding tasks via Claude Code CLI
- **Real-time Progress** — Streaming tool progress updates as Claude works
- **Session Management** — Resume Claude Code sessions, share sessions with VSCode
- **File Navigation** — Browse, view, download, copy, paste, and delete files
- **Code Viewer** — Syntax-highlighted code viewing with pagination
- **Project Switching** — Manage multiple projects with one bot
- **i18n** — Korean and English UI via `/lang`
- **Auth** — Chat ID whitelist for security

## Architecture

```
[Telegram App (Phone)]
        │
        ▼  (polling)
[NestJS Application Context]
   ├── TelegramModule       ← grammY bot, command handlers
   ├── ClaudeCodeModule     ← CLI spawn, session management
   ├── FileModule           ← File ops, change detection
   └── ConfigModule         ← Environment configuration
        │
        ▼  (spawn)
[Claude Code CLI]
   ├── Read/write project files
   ├── Session history (~/.claude/)  ← Shared with VSCode
   └── CLAUDE.md context
```

## Prerequisites

- **Node.js** 18+
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
- **Telegram Bot Token** — Create via [@BotFather](https://t.me/BotFather)

## Setup

```bash
git clone https://github.com/fghy788/telegramcode.git
cd telegramcode
npm install
```

Create `.env`:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_CHAT_IDS=your_chat_id

# Claude Code
DEFAULT_PROJECT_PATH=/path/to/default/project
CLAUDE_TIMEOUT_MS=300000
```

> Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot) on Telegram.

## Run

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Commands

### Navigation

| Command | Description |
|---------|-------------|
| `/ls [path]` | List files and folders |
| `/cd <path>` | Change directory (supports `~`) |
| `/pwd` | Show current working directory |
| `/tree [path]` | Display directory tree |
| `/home` | Go to project root |

### File Management

| Command | Description |
|---------|-------------|
| `/code <file>` | View file with syntax highlighting |
| `/file <path>` | Download file |
| `/files` | Download files changed by last task |
| `/folder <name>` | Create folder |
| `/copy <file>` | Copy file path to clipboard |
| `/paste <path>` | Paste clipboard file to path |
| `/rm <path>` | Delete file/folder (with confirmation) |

### Project / Session

| Command | Description |
|---------|-------------|
| `/projects` | List registered projects (inline buttons) |
| `/project [path]` | Set project by path or current directory |
| `/sessions` | List sessions (includes VSCode sessions) |
| `/new` | Start a new session |
| `/leave` | Unset project for free navigation |

### System

| Command | Description |
|---------|-------------|
| `/status` | Show bot status and current context |
| `/help` | Show all commands |
| `/break` | Stop running task |
| `/lang` | Switch language (Korean / English) |

### Plain Text

Any message without `/` is sent to Claude Code as a task request in the current session.

## Project Structure

```
src/
├── main.ts                          # Entry point (no HTTP server)
├── app.module.ts
├── config/
│   └── configuration.ts
├── claude-code/
│   ├── claude-code.service.ts       # CLI spawn with stream-json
│   ├── session.service.ts           # Session listing from ~/.claude/
│   ├── state.service.ts             # Per-user state persistence
│   └── interfaces/
├── telegram/
│   ├── telegram.service.ts          # Bot setup, command routing
│   ├── telegram.format.ts           # HTML formatting helpers
│   └── handlers/
│       ├── navigation.handler.ts    # ls, cd, pwd, tree, home
│       ├── file-command.handler.ts  # file, code, copy, paste, rm
│       ├── project.handler.ts       # projects, sessions, leave
│       ├── message.handler.ts       # Plain text → Claude Code
│       └── system.handler.ts        # help, status, break, lang
├── file/
│   └── file.service.ts             # File ops, snapshot, change detection
└── common/
    ├── i18n/messages.ts             # Korean & English translations
    └── utils/path.util.ts           # Path security, tilde expansion
```

## How It Works

1. Bot starts with `NestFactory.createApplicationContext()` (no HTTP server)
2. grammY polls Telegram for updates via `@grammyjs/runner`
3. Plain text messages are sent to Claude Code CLI via `spawn('claude', [...])`
4. CLI runs with `--output-format stream-json --verbose --dangerously-skip-permissions`
5. `stdin` is immediately closed to prevent CLI hang ([known issue](https://github.com/anthropics/claude-code/issues/771))
6. Tool progress events are streamed back as separate Telegram messages
7. File changes are detected by comparing mtime snapshots before/after execution

## State Persistence

User state is saved to `~/.telegram-claude/state.json`:

```json
{
  "123456789": {
    "projectPath": "/Users/me/projects/myapp",
    "sessionId": "abc-def-123",
    "cwd": "/Users/me/projects/myapp/src",
    "clipboard": null,
    "lang": "ko",
    "lastUsed": "2026-02-22T10:00:00Z"
  }
}
```

## License

MIT

---

# 한국어

Telegram 메신저로 Mac에서 실행되는 [Claude Code](https://github.com/anthropics/claude-code) CLI에 코딩 작업을 요청하고 결과를 받아보는 봇입니다.

## 주요 기능

- **Claude Code 연동** — 일반 텍스트를 보내면 Claude Code CLI로 코딩 작업 요청
- **실시간 진행 상황** — 도구 사용 진행 상황을 스트리밍으로 전송
- **세션 관리** — Claude Code 세션 이어가기, VSCode 세션 공유
- **파일 탐색** — 탐색, 조회, 다운로드, 복사, 붙여넣기, 삭제
- **코드 뷰어** — 구문 강조 + 페이지네이션
- **프로젝트 전환** — 여러 프로젝트를 하나의 봇으로 관리
- **다국어** — `/lang`으로 한국어/영어 전환
- **보안** — Chat ID 화이트리스트

## 사전 준비

- **Node.js** 18+
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
- **Telegram Bot 토큰** — [@BotFather](https://t.me/BotFather)에서 생성

## 설치

```bash
git clone https://github.com/fghy788/telegramcode.git
cd telegramcode
npm install
```

`.env` 파일 생성:

```env
# Telegram
TELEGRAM_BOT_TOKEN=봇_토큰
ALLOWED_CHAT_IDS=채팅_ID

# Claude Code
DEFAULT_PROJECT_PATH=/기본/프로젝트/경로
CLAUDE_TIMEOUT_MS=300000
```

> Chat ID는 Telegram에서 [@userinfobot](https://t.me/userinfobot)에게 메시지를 보내면 확인할 수 있습니다.

## 실행

```bash
# 개발 모드 (watch)
npm run start:dev

# 프로덕션
npm run build
npm run start:prod
```

## 명령어

### 네비게이션

| 명령어 | 설명 |
|--------|------|
| `/ls [경로]` | 파일/폴더 목록 |
| `/cd <경로>` | 디렉토리 이동 (`~` 지원) |
| `/pwd` | 현재 작업 경로 |
| `/tree [경로]` | 디렉토리 트리 |
| `/home` | 프로젝트 루트로 이동 |

### 파일 관리

| 명령어 | 설명 |
|--------|------|
| `/code <파일>` | 구문 강조 코드 보기 |
| `/file <경로>` | 파일 다운로드 |
| `/files` | 마지막 작업에서 변경된 파일 전송 |
| `/folder <이름>` | 폴더 생성 |
| `/copy <파일>` | 클립보드에 복사 |
| `/paste <경로>` | 붙여넣기 |
| `/rm <경로>` | 삭제 (확인 후 실행) |

### 프로젝트 / 세션

| 명령어 | 설명 |
|--------|------|
| `/projects` | 등록된 프로젝트 목록 (인라인 버튼) |
| `/project [경로]` | 프로젝트 설정 |
| `/sessions` | 세션 목록 (VSCode 세션 포함) |
| `/new` | 새 세션 시작 |
| `/leave` | 프로젝트 해제 (자유 탐색) |

### 시스템

| 명령어 | 설명 |
|--------|------|
| `/status` | 봇 상태 및 현재 컨텍스트 |
| `/help` | 전체 명령어 목록 |
| `/break` | 실행 중인 작업 중단 |
| `/lang` | 언어 변경 (한국어 / English) |

### 일반 텍스트

`/`로 시작하지 않는 모든 메시지는 현재 세션에서 Claude Code 작업 요청으로 전달됩니다.

## 사용 시나리오

### 처음 사용
```
유저: /project ~/projects/myapp
봇:  ✅ 프로젝트 설정: myapp

유저: auth 모듈 만들어줘 JWT 기반으로
봇:  ⏳ 작업 시작...
봇:  🔧 Write src/auth/auth.service.ts
봇:  ✅ 작업 완료
     📁 변경된 파일:
      🆕 src/auth/auth.module.ts (생성)
      🆕 src/auth/auth.service.ts (생성)
     📎 /files 로 파일을 받을 수 있습니다.
```

### VSCode 세션 이어가기
```
유저: /sessions
봇:  💬 세션 선택 (myapp)
     [auth 모듈 작업 - 2시간 전]  ← VSCode에서 만든 세션

유저: [버튼 클릭]
봇:  ✅ 세션 연결됨.

유저: refresh token 로직 추가해줘
봇:  ⏳ 작업 시작...  (--resume으로 세션 이어가기)
```

## 동작 원리

1. `NestFactory.createApplicationContext()`로 HTTP 서버 없이 시작
2. grammY가 `@grammyjs/runner`로 Telegram 업데이트 폴링
3. 일반 텍스트 → `spawn('claude', [...])` 로 CLI 호출
4. `--output-format stream-json --verbose --dangerously-skip-permissions` 플래그 사용
5. `stdin`을 즉시 닫아 CLI 행(hang) 방지 ([알려진 이슈](https://github.com/anthropics/claude-code/issues/771))
6. 도구 진행 이벤트를 별도 Telegram 메시지로 스트리밍
7. 실행 전후 mtime 스냅샷 비교로 파일 변경 감지
