# 프로젝트 계획서: Telegram ↔ Claude Code 중계 서버 (최종)

## 개요

외부에서 Telegram 메신저로 Mac mini에 코드 작업을 요청하고, Claude Code CLI가 실행한 결과를 받아보는 NestJS 서버.
서버 구동 시 Cloudflare Tunnel이 자동으로 열리며, VSCode에서 작업하던 세션을 Telegram에서 이어서 사용할 수 있다.

## 핵심 포인트

- **환경:** macOS (Mac mini)
- **서버 포트:** 8080
- **Cloudflare Tunnel:** NestJS 서버 구동 시 자동 실행, Telegram Webhook 자동 등록
- **VSCode 세션 공유:** Claude Code Extension과 CLI는 `~/.claude/` 안의 세션 히스토리를 공유. VSCode에서 작업하던 세션을 Telegram에서 이어갈 수 있고 그 반대도 가능.

## 아키텍처

```
[Telegram (폰/외부)]
        │
        ▼
[Cloudflare Tunnel (HTTPS) ← NestJS 부팅 시 자동 실행]
        │
        ▼
[NestJS 서버 (Mac mini, :8080)]
   ├── TelegramModule       ← Webhook 수신/응답/파일전송
   ├── ClaudeCodeModule     ← CLI 호출, 세션 관리
   ├── FileModule           ← 파일 관리, 변경 감지, 전송
   ├── TunnelModule         ← Cloudflare Tunnel 자동 관리
   └── AuthGuard            ← chat_id 화이트리스트
        │
        ▼
[Claude Code CLI]
   ├── 프로젝트 파일 읽기/쓰기
   ├── 세션 히스토리 (~/.claude/) ← VSCode Extension과 공유
   └── CLAUDE.md 컨텍스트
```

## 서버 상태 관리

서버는 현재 작업 컨텍스트를 상태로 관리한다. 일반 텍스트 입력 시 이 상태를 기반으로 Claude Code CLI를 호출한다.

```typescript
// 유저(chatId)별로 관리되는 상태
interface UserState {
  projectPath: string;    // 현재 프로젝트 경로
  sessionId: string | null; // 현재 연결된 세션 (null이면 새 세션 자동 생성)
  cwd: string;            // 현재 작업 디렉토리 (/cd로 이동)
  clipboard: string | null; // /copy로 저장한 파일 경로
}
```

**일반 텍스트 입력 시 동작:**
```
세션 있음 → claude --resume {sessionId} -p "{메시지}"
세션 없음 → claude -p "{메시지}" --project {프로젝트} → 생성된 sessionId 저장
```

세션은 `/sessions`에서 선택하거나 `/new`로 변경할 때만 바뀌고, 그 외에는 대화하듯 일반 텍스트만 보내면 된다.

**상태 저장:**
- `~/.telegram-claude/state.json`에 저장
- 서버 재시작 시에도 유지

```json
{
  "123456789": {
    "projectPath": "/Users/username/projects/myapp",
    "sessionId": "abc-def-123",
    "cwd": "/Users/username/projects/myapp/src/auth",
    "clipboard": null,
    "lastUsed": "2026-02-19T10:00:00Z"
  }
}
```

## 명령어 체계

### 네비게이션

| 명령어 | 동작 | 예시 |
|---|---|---|
| `/ls` | 현재 작업 디렉토리의 파일/폴더 목록 | `/ls` |
| `/ls path` | 특정 경로의 파일/폴더 목록 | `/ls src/auth` |
| `/cd path` | 디렉토리 이동 | `/cd src/modules` |
| `/cd ..` | 상위 디렉토리로 이동 | `/cd ..` |
| `/tree` | 현재 프로젝트 디렉토리 트리 출력 | `/tree` |
| `/pwd` | 현재 작업 경로 확인 | `/pwd` |

### 파일 관리

| 명령어 | 동작 | 예시 |
|---|---|---|
| `/file path` | 파일을 Telegram 파일로 전송 (내용 확인용) | `/file src/main.ts` |
| `/files` | 마지막 Claude Code 실행에서 변경된 파일들 전송 | `/files` |
| `/folder name` | 현재 작업 디렉토리에 폴더 생성 | `/folder utils` |
| `/copy filename` | 파일 경로를 서버 클립보드에 저장 | `/copy auth.service.ts` |
| `/paste path` | 클립보드에 저장된 파일을 지정 경로에 복사 | `/paste src/backup/` |
| `/rm path` | 파일/폴더 삭제 (확인 메시지 후 실행) | `/rm old-file.ts` |

### 프로젝트 / 세션

| 명령어 | 동작 | 예시 |
|---|---|---|
| `/projects` | 등록된 프로젝트 목록을 인라인 버튼으로 표시. 버튼 클릭 시 프로젝트 전환 | `/projects` |
| `/project path` | 프로젝트를 직접 경로로 지정 | `/project /Users/me/myapp` |
| `/sessions` | 현재 프로젝트의 세션 목록을 인라인 버튼으로 표시 (VSCode 세션 포함). 버튼 클릭 시 해당 세션 연결 | `/sessions` |
| `/new` | 현재 프로젝트에서 새 세션 시작. 기존 세션 연결 해제 | `/new` |

### 시스템

| 명령어 | 동작 | 예시 |
|---|---|---|
| `/status` | 서버 상태, Tunnel URL, 현재 프로젝트/세션/작업디렉토리 정보 | `/status` |
| `/help` | 전체 명령어 목록 | `/help` |

### 일반 텍스트

명령어(`/`)로 시작하지 않는 모든 입력은 현재 연결된 세션에 Claude Code 작업 요청으로 전달된다.

```
유저: auth 모듈 만들어줘 JWT 기반으로
→ claude --resume {현재sessionId} -p "auth 모듈 만들어줘 JWT 기반으로"
```

## Telegram 인라인 버튼 UI

### `/projects` 응답 예시
```
📂 프로젝트 선택

[myapp          ]  ← 버튼
[webapp         ]  ← 버튼
[api-server     ]  ← 버튼
```
버튼 클릭 시: 프로젝트 전환 + cwd 리셋 + 세션 해제 + 확인 메시지

### `/sessions` 응답 예시
```
💬 세션 선택 (myapp)

[auth 모듈 작업 - 2시간 전  ]  ← 버튼
[버그 수정 - 어제            ]  ← 버튼
[리팩토링 - 3일 전           ]  ← 버튼
```
버튼 클릭 시: 해당 세션 연결 + 확인 메시지 ("✅ 세션 연결됨. 이제 메시지를 보내면 이 세션에서 작업합니다.")

### `/rm` 확인 예시
```
⚠️ 정말 삭제하시겠습니까?
src/old-file.ts

[삭제]  [취소]
```

## 모듈 상세

### 1. TunnelModule

**역할:** NestJS 서버 구동 시 Cloudflare Tunnel 자동 실행 및 관리

**동작 방식:**
- NestJS `OnModuleInit`에서 `cloudflared tunnel` 프로세스 spawn
- stderr에서 Tunnel URL 파싱 (*.trycloudflare.com)
- 파싱 완료 후 Telegram `setWebhook` API 자동 호출
- `OnModuleDestroy`에서 Tunnel 프로세스 kill

```typescript
@Injectable()
export class TunnelService implements OnModuleInit, OnModuleDestroy {
  private tunnelProcess: ChildProcess;
  private tunnelUrl: string;

  async onModuleInit() {
    this.tunnelProcess = spawn('cloudflared', [
      'tunnel', '--url', 'http://localhost:8080'
    ]);

    this.tunnelProcess.stderr.on('data', (data) => {
      const match = data.toString().match(/https:\/\/[^\s]+\.trycloudflare\.com/);
      if (match) {
        this.tunnelUrl = match[0];
        this.registerWebhook(this.tunnelUrl);
      }
    });
  }

  async onModuleDestroy() {
    this.tunnelProcess?.kill();
  }

  private async registerWebhook(tunnelUrl: string) {
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `${tunnelUrl}/webhook/telegram` })
      }
    );
  }
}
```

**Quick Tunnel (무료)은 매번 URL이 바뀌지만, Webhook 자동 재등록으로 문제없음.**

### 2. TelegramModule

**역할:** Telegram Bot API 통신

**기능:**
- Webhook 엔드포인트 (`POST /webhook/telegram`)
- 텍스트 메시지 수신 → 명령어/일반텍스트 분기
- 텍스트 응답 전송 (4096자 초과 시 자동 분할)
- 파일 전송 (`sendDocument`)
- 마크다운 포맷 (코드 블록)
- typing 액션 (작업 중 표시, 5초마다 반복 전송)
- 인라인 키보드 버튼 생성 및 콜백 처리

**사용 라이브러리:** `telegraf`

### 3. ClaudeCodeModule

**역할:** Claude Code CLI 호출 및 세션 관리

**CLI 호출:**
- 새 세션: `claude -p "{메시지}" --project {프로젝트경로}`
- 세션 이어가기: `claude --resume {sessionId} -p "{메시지}"`
- stdout 캡처 후 파싱하여 Telegram으로 전달

**세션 목록 조회:**
```typescript
// ~/.claude/projects/ 하위의 세션 파일들을 스캔
// VSCode Extension에서 생성한 세션도 여기에 포함됨
const sessionsDir = path.join(
  os.homedir(), '.claude', 'projects', projectPathHash, 'sessions'
);
```

**프로젝트 목록 관리:**
- `~/.telegram-claude/projects.json`에 등록된 프로젝트 경로 목록 저장
- `/project path`로 새 프로젝트 추가 시 자동 등록
- `/projects`에서 인라인 버튼으로 표시

```json
[
  "/Users/username/projects/myapp",
  "/Users/username/projects/webapp",
  "/Users/username/projects/api-server"
]
```

**주의사항:**
- Claude Code CLI 실행은 비동기, 수 분 걸릴 수 있음
- 타임아웃 기본 5분 (CLAUDE_TIMEOUT_MS로 설정 가능)
- `claude -p` (headless 모드)의 세션 영속 여부 테스트 필요. 안 되면 대안적 호출 방식 검토.

### 4. FileModule

**역할:** 파일 시스템 조작 및 변경 감지

**파일 관리 기능:**
- `/ls`: `fs.readdir`로 디렉토리 목록 (파일/폴더 구분, 사이즈 표시)
- `/cd`: UserState의 cwd 변경 (존재하는 경로인지 검증)
- `/tree`: 재귀적 디렉토리 트리 출력 (depth 제한, 무시 패턴 적용)
- `/folder`: `fs.mkdir`으로 폴더 생성
- `/copy` + `/paste`: 서버 메모리에 경로 저장 후 `fs.copyFile`
- `/rm`: 확인 후 `fs.rm`
- `/file`: 파일을 Telegram sendDocument로 전송

**변경 감지:**
- Claude Code 실행 전: 프로젝트 내 파일들의 mtime 스냅샷 저장
- Claude Code 실행 후: 스냅샷 비교하여 변경 파일 추출 (생성/수정/삭제)
- `.git`, `node_modules`, `dist`, `.next`, `.claude` 등 무시

**변경 감지 응답 포맷:**
```
✅ 작업 완료

[Claude Code 응답 요약]

📁 변경된 파일:
 ✏️ src/auth/auth.service.ts (수정)
 🆕 src/auth/auth.controller.ts (생성)
 🗑️ src/old-auth.ts (삭제)

📎 /files 로 파일을 받을 수 있습니다.
```

### 5. AuthGuard

**역할:** 보안 — 허용된 사용자만 접근 가능

- Telegram chat_id가 `ALLOWED_CHAT_IDS`에 포함되는지 확인
- 불허 시 무시 (응답 안 함)
- 모든 Webhook 요청 및 콜백 쿼리에 글로벌 적용

## 환경변수 (.env)

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_CHAT_IDS=123456789

# Claude Code
DEFAULT_PROJECT_PATH=/Users/username/projects
CLAUDE_TIMEOUT_MS=300000

# Server
PORT=8080
```

**TELEGRAM_WEBHOOK_URL은 불필요.** TunnelModule이 동적 파싱 후 자동 등록.

## 디렉토리 구조

```
src/
├── main.ts
├── app.module.ts
├── common/
│   └── guards/
│       └── auth.guard.ts
├── telegram/
│   ├── telegram.module.ts
│   ├── telegram.controller.ts         # Webhook 엔드포인트 + 콜백 쿼리 처리
│   └── telegram.service.ts            # 메시지/파일/버튼 전송
├── claude-code/
│   ├── claude-code.module.ts
│   ├── claude-code.service.ts         # CLI 호출, 세션/프로젝트 관리
│   └── interfaces/
│       └── session.interface.ts
├── file/
│   ├── file.module.ts
│   └── file.service.ts               # 파일 조작, 변경 감지
├── tunnel/
│   ├── tunnel.module.ts
│   └── tunnel.service.ts             # Cloudflare Tunnel 자동 실행
└── config/
    └── configuration.ts
```

## 실행 흐름

### 서버 시작
```
1. npm run start
2. NestJS 부팅
3. TunnelModule: cloudflared tunnel --url http://localhost:8080 실행
4. TunnelModule: stderr에서 Tunnel URL 파싱
5. TunnelModule: Telegram setWebhook 자동 등록
6. 콘솔 출력: "🚀 서버 준비 완료 — Tunnel: https://xxx.trycloudflare.com"
```

### 시나리오 1: 처음 사용
```
유저: /project /Users/me/projects/myapp
봇:  ✅ 프로젝트 설정: myapp (/Users/me/projects/myapp)

유저: auth 모듈 만들어줘 JWT 기반으로
봇:  ⏳ 작업 중...
봇:  ✅ 작업 완료
     [Claude Code 응답 요약]
     📁 변경된 파일:
      🆕 src/auth/auth.module.ts
      🆕 src/auth/auth.service.ts
      🆕 src/auth/auth.controller.ts
     📎 /files 로 파일을 받을 수 있습니다.

유저: /files
봇:  📎 auth.module.ts
     📎 auth.service.ts
     📎 auth.controller.ts
```

### 시나리오 2: 세션 이어가기
```
유저: 에러 핸들링도 넣어줘
봇:  ⏳ 작업 중... (자동으로 같은 세션에서 --resume)
봇:  ✅ 작업 완료
     [결과]
```

### 시나리오 3: VSCode 세션 가져오기
```
유저: /sessions
봇:  💬 세션 선택 (myapp)
     [auth 모듈 작업 - 2시간 전  ]  ← VSCode에서 만든 세션
     [API 리팩토링 - 어제         ]  ← CLI에서 만든 세션

유저: [auth 모듈 작업 버튼 클릭]
봇:  ✅ 세션 연결됨: auth 모듈 작업
     이제 메시지를 보내면 이 세션에서 작업합니다.

유저: 여기에 refresh token 로직 추가해줘
봇:  ⏳ 작업 중...
봇:  ✅ 작업 완료
     [결과]
```

### 시나리오 4: 파일 탐색
```
유저: /ls
봇:  📂 /Users/me/projects/myapp
     📁 src/
     📁 test/
     📄 package.json (2.1KB)
     📄 tsconfig.json (0.5KB)
     📄 CLAUDE.md (1.2KB)

유저: /cd src/auth
봇:  📂 이동: /Users/me/projects/myapp/src/auth

유저: /file auth.service.ts
봇:  📎 auth.service.ts (파일 전송)
```

### 시나리오 5: 파일 복사
```
유저: /copy auth.service.ts
봇:  📋 복사됨: /Users/me/projects/myapp/src/auth/auth.service.ts

유저: /cd ../user
봇:  📂 이동: /Users/me/projects/myapp/src/user

유저: /paste .
봇:  ✅ 붙여넣기 완료: auth.service.ts → /Users/me/projects/myapp/src/user/auth.service.ts
```

### 시나리오 6: 귀가 후 VSCode에서 이어서 작업
```
1. VSCode에서 Claude Code 열기
2. Past Conversations에서 Telegram으로 작업한 세션 선택
3. 코드 리뷰 및 수정 작업 계속
```

## 필요 패키지

```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/config": "^3.x",
    "telegraf": "^4.x"
  }
}
```

## 사전 설치 (Mac mini)

```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Cloudflare Tunnel
brew install cloudflared

# NestJS 프로젝트 세팅
nest new telegram-claude-bot
cd telegram-claude-bot
npm install @nestjs/config telegraf
```

## 주의사항

1. **`claude -p` 세션 영속:** headless 모드에서 세션이 자동 저장되는지 테스트 필요. 안 되면 대안적 호출 방식 검토.
2. **Quick Tunnel URL 변동:** 서버 재시작마다 URL이 바뀌지만 Webhook 자동 재등록으로 처리됨.
3. **CLI 실행 시간:** 큰 작업은 수 분 걸릴 수 있음. 타임아웃 충분히 설정. Telegram typing 액션을 5초마다 반복 전송.
4. **보안:** ALLOWED_CHAT_IDS 반드시 설정. Bot 토큰 노출 시 누구나 로컬 파일 접근 가능.
5. **경로 보안:** `/ls`, `/cd`, `/file` 등 파일 접근 명령어는 프로젝트 디렉토리 범위 내로 제한. 상위 디렉토리 탈출 방지.

## 추후 확장 가능

- 웹 대시보드 (세션 관리, 로그 확인)
- 여러 프로젝트 동시 관리
- Claude Code 출력 스트리밍 (부분 결과 실시간 전송)
- 이미지/스크린샷 전송
- 음성 메시지 → STT → 명령어
- Git 연동 명령어 (/git status, /git commit 등)
