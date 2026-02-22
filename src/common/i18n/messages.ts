export type Lang = 'ko' | 'en';

export interface Messages {
  // System
  langSwitched: string;
  unknownCommand: (cmd: string) => string;

  // Help
  helpTitle: string;
  helpNav: string;
  helpLs: string;
  helpCd: string;
  helpPwd: string;
  helpTree: string;
  helpHome: string;
  helpFile: string;
  helpCode: string;
  helpFileDownload: string;
  helpFiles: string;
  helpFolder: string;
  helpCopy: string;
  helpPaste: string;
  helpRm: string;
  helpProject: string;
  helpProjects: string;
  helpProjectSet: string;
  helpSessions: string;
  helpNew: string;
  helpLeave: string;
  helpSystem: string;
  helpStatus: string;
  helpBreak: string;
  helpHelp: string;
  helpLang: string;
  helpFooter: string;

  // Status
  statusTitle: string;
  statusProject: string;
  statusPath: string;
  statusSession: string;
  statusCwd: string;
  statusState: string;
  statusRunning: string;
  statusIdle: string;
  statusNone: string;
  statusNotSet: string;
  statusAutoSession: string;

  // Navigation
  usageCd: string;
  usageFile: string;
  usageFolder: string;
  usageCopy: string;
  usagePaste: string;
  usageRm: string;
  usageCode: string;
  setProjectFirst: string;
  outsideProject: string;
  outsideProjectCd: string;
  outsideProjectCreate: string;
  outsideProjectCopy: string;
  outsideProjectPaste: string;
  outsideProjectDelete: string;
  dirNotFound: (dir: string) => string;
  movedTo: (dir: string) => string;
  movedToRoot: string;
  deleteConfirm: string;
  deleteComplete: (name: string) => string;
  deleteFailed: (msg: string) => string;
  deleteExpired: string;
  cancelled: string;

  // Project
  noProjects: string;
  selectProject: string;
  projectSet: (name: string, fullPath: string) => string;
  projectSwitched: (name: string, fullPath: string) => string;
  projectNotFound: (name: string) => string;
  projectListChanged: string;
  projectLeft: string;

  // Session
  noSessions: string;
  selectSession: string;
  sessionConnected: string;
  recentChat: string;
  newSessionStarted: string;

  // Execution
  taskStarted: string;
  taskRunning: string;
  taskComplete: string;
  generating: string;
  changedFiles: string;
  filesDownload: string;
  noChangedFiles: string;
  errorOccurred: (msg: string) => string;
  breakSuccess: string;
  breakNoTask: string;
  projectNotSet: string;

  // File
  fileNotFound: (name: string) => string;
  searchResults: (name: string, count: number) => string;
  fileSendFailed: (msg: string) => string;
  fileReadFailed: (msg: string) => string;
  folderCreated: (name: string) => string;
  copied: (path: string) => string;
  clipboardEmpty: string;
  pasteComplete: (from: string, to: string) => string;
  codeExpired: string;

  // Code viewer
  linesLabel: string;
  prevPage: string;
  nextPage: string;

  // Buttons
  deleteBtn: string;
  cancelBtn: string;

  // File change labels
  changeCreated: string;
  changeModified: string;
  changeDeleted: string;
  sendFailed: (name: string) => string;

  // Project extra
  projectSetFromCwd: (name: string, full: string) => string;
  cdFirstThenProject: string;

  // Tool progress
  toolTodoUpdate: string;
}

const ko: Messages = {
  langSwitched: '🌐 한국어로 변경되었습니다.',
  unknownCommand: (cmd) => `❌ 알 수 없는 명령어: /${cmd}\n/help 로 명령어 목록을 확인하세요.`,

  helpTitle: '📖 <b>명령어 목록</b>',
  helpNav: '<b>네비게이션</b>',
  helpLs: '/ls — 파일/폴더 목록',
  helpCd: '/cd &lt;경로&gt; — 디렉토리 이동',
  helpPwd: '/pwd — 현재 경로 확인',
  helpTree: '/tree — 디렉토리 트리',
  helpHome: '/home — 프로젝트 루트로 이동',
  helpFile: '<b>파일 관리</b>',
  helpCode: '/code &lt;파일명&gt; — 코드 보기',
  helpFileDownload: '/file &lt;경로&gt; — 파일 다운로드',
  helpFiles: '/files — 변경 파일 전송',
  helpFolder: '/folder &lt;이름&gt; — 폴더 생성',
  helpCopy: '/copy &lt;파일&gt; — 클립보드 복사',
  helpPaste: '/paste &lt;경로&gt; — 붙여넣기',
  helpRm: '/rm &lt;경로&gt; — 삭제',
  helpProject: '<b>프로젝트 / 세션</b>',
  helpProjects: '/projects — 프로젝트 목록',
  helpProjectSet: '/project &lt;이름&gt; — 프로젝트 설정',
  helpSessions: '/sessions — 세션 목록',
  helpNew: '/new — 새 세션',
  helpLeave: '/leave — 프로젝트 해제',
  helpSystem: '<b>시스템</b>',
  helpStatus: '/status — 서버 상태',
  helpBreak: '/break — 작업 중단',
  helpHelp: '/help — 도움말',
  helpLang: '/lang — 언어 변경',
  helpFooter: '일반 텍스트를 보내면 Claude Code에 작업을 요청합니다.',

  statusTitle: '📊 <b>서버 상태</b>',
  statusProject: '프로젝트',
  statusPath: '경로',
  statusSession: '세션',
  statusCwd: '작업 디렉토리',
  statusState: '상태',
  statusRunning: '🔄 실행 중',
  statusIdle: '대기 중',
  statusNone: '없음',
  statusNotSet: '미설정',
  statusAutoSession: '없음 (자동 생성)',

  usageCd: '사용법: /cd &lt;경로&gt;',
  usageFile: '사용법: /file &lt;파일경로&gt;',
  usageFolder: '사용법: /folder &lt;이름&gt;',
  usageCopy: '사용법: /copy &lt;파일명&gt;',
  usagePaste: '사용법: /paste &lt;대상경로&gt;',
  usageRm: '사용법: /rm &lt;경로&gt;',
  usageCode: '사용법: /code &lt;파일명&gt;',
  setProjectFirst: '프로젝트를 먼저 설정하세요.',
  outsideProject: '프로젝트 디렉토리 밖에 접근할 수 없습니다.',
  outsideProjectCd: '프로젝트 디렉토리 밖으로 이동할 수 없습니다.\n/leave 로 프로젝트를 해제하세요.',
  outsideProjectCreate: '프로젝트 디렉토리 밖에 폴더를 생성할 수 없습니다.',
  outsideProjectCopy: '프로젝트 디렉토리 밖의 파일을 복사할 수 없습니다.',
  outsideProjectPaste: '프로젝트 디렉토리 밖에 붙여넣을 수 없습니다.',
  outsideProjectDelete: '프로젝트 디렉토리 밖의 파일을 삭제할 수 없습니다.',
  dirNotFound: (dir) => `❌ 디렉토리가 존재하지 않습니다: ${dir}`,
  movedTo: (dir) => `📂 이동: ${dir}`,
  movedToRoot: '📂 프로젝트 루트로 이동',
  deleteConfirm: '⚠️ 정말 삭제하시겠습니까?',
  deleteComplete: (name) => `✅ 삭제 완료: ${name}`,
  deleteFailed: (msg) => `❌ 삭제 실패: ${msg}`,
  deleteExpired: '삭제 대상이 만료되었습니다.',
  cancelled: '취소되었습니다.',

  noProjects: '등록된 프로젝트가 없습니다.\n/project &lt;전체경로&gt; 로 프로젝트를 추가하세요.',
  selectProject: '📂 프로젝트 선택',
  projectSet: (name, full) => `✅ 프로젝트 설정: ${name} (${full})`,
  projectSwitched: (name, full) => `✅ 프로젝트 전환: ${name}\n📂 ${full}`,
  projectNotFound: (name) => `❌ 프로젝트를 찾을 수 없습니다: ${name}\n/projects 로 목록을 확인하세요.`,
  projectListChanged: '프로젝트 목록이 변경되었습니다. /projects 로 다시 선택하세요.',
  projectLeft: '📤 프로젝트를 해제했습니다.\n자유롭게 /cd 로 이동 후 /project 로 새 프로젝트를 설정하세요.',

  noSessions: '세션이 없습니다. 메시지를 보내면 새 세션이 자동 생성됩니다.',
  selectSession: '💬 세션 선택',
  sessionConnected: '✅ 세션 연결됨.\n이제 메시지를 보내면 이 세션에서 작업합니다.',
  recentChat: '📜 최근 대화:',
  newSessionStarted: '✅ 새 세션을 시작합니다. 메시지를 보내면 새 세션이 생성됩니다.',

  taskStarted: '⏳ 작업 시작...',
  taskRunning: '⏳ 이전 작업이 아직 실행 중입니다.\n/break 으로 중단하거나 완료를 기다려주세요.',
  taskComplete: '✅ 작업 완료',
  generating: '💭 응답 생성 중...',
  changedFiles: '📁 변경된 파일:',
  filesDownload: '📎 /files 로 파일을 받을 수 있습니다.',
  noChangedFiles: '변경된 파일이 없습니다.',
  errorOccurred: (msg) => `❌ 오류 발생: ${msg}`,
  breakSuccess: '🛑 작업을 중단했습니다.',
  breakNoTask: '실행 중인 작업이 없습니다.',
  projectNotSet: '프로젝트가 설정되지 않았습니다.\n/project &lt;경로&gt; 또는 /projects 로 프로젝트를 선택하세요.',

  fileNotFound: (name) => `❌ "${name}" 파일을 찾을 수 없습니다.`,
  searchResults: (name, count) => `📂 "${name}" 검색 결과 (${count}개)`,
  fileSendFailed: (msg) => `❌ 파일 전송 실패: ${msg}`,
  fileReadFailed: (msg) => `❌ 파일 읽기 실패: ${msg}`,
  folderCreated: (name) => `✅ 폴더 생성: ${name}`,
  copied: (p) => `📋 복사됨: ${p}`,
  clipboardEmpty: '클립보드가 비어있습니다. /copy 로 먼저 복사하세요.',
  pasteComplete: (from, to) => `✅ 붙여넣기 완료: ${from} → ${to}`,
  codeExpired: '코드 보기 세션이 만료되었습니다. /code 로 다시 열어주세요.',

  linesLabel: '줄',
  prevPage: '◀ 이전',
  nextPage: '다음 ▶',

  deleteBtn: '삭제',
  cancelBtn: '취소',

  changeCreated: '생성',
  changeModified: '수정',
  changeDeleted: '삭제',
  sendFailed: (name) => `❌ ${name} 전송 실패`,

  projectSetFromCwd: (name, full) => `✅ 프로젝트 설정: ${name} (${full})`,
  cdFirstThenProject: '/cd 로 먼저 디렉토리를 이동한 뒤 /project 를 입력하세요.',

  toolTodoUpdate: '작업 목록 업데이트',
};

const en: Messages = {
  langSwitched: '🌐 Switched to English.',
  unknownCommand: (cmd) => `❌ Unknown command: /${cmd}\nType /help to see available commands.`,

  helpTitle: '📖 <b>Commands</b>',
  helpNav: '<b>Navigation</b>',
  helpLs: '/ls — List files/folders',
  helpCd: '/cd &lt;path&gt; — Change directory',
  helpPwd: '/pwd — Current path',
  helpTree: '/tree — Directory tree',
  helpHome: '/home — Go to project root',
  helpFile: '<b>File Management</b>',
  helpCode: '/code &lt;file&gt; — View code',
  helpFileDownload: '/file &lt;path&gt; — Download file',
  helpFiles: '/files — Send changed files',
  helpFolder: '/folder &lt;name&gt; — Create folder',
  helpCopy: '/copy &lt;file&gt; — Copy to clipboard',
  helpPaste: '/paste &lt;path&gt; — Paste',
  helpRm: '/rm &lt;path&gt; — Delete',
  helpProject: '<b>Project / Session</b>',
  helpProjects: '/projects — Project list',
  helpProjectSet: '/project &lt;name&gt; — Set project',
  helpSessions: '/sessions — Session list',
  helpNew: '/new — New session',
  helpLeave: '/leave — Leave project',
  helpSystem: '<b>System</b>',
  helpStatus: '/status — Server status',
  helpBreak: '/break — Stop running task',
  helpHelp: '/help — This help',
  helpLang: '/lang — Change language',
  helpFooter: 'Send plain text to request Claude Code to work.',

  statusTitle: '📊 <b>Server Status</b>',
  statusProject: 'Project',
  statusPath: 'Path',
  statusSession: 'Session',
  statusCwd: 'Working Dir',
  statusState: 'Status',
  statusRunning: '🔄 Running',
  statusIdle: 'Idle',
  statusNone: 'None',
  statusNotSet: 'Not set',
  statusAutoSession: 'None (auto-create)',

  usageCd: 'Usage: /cd &lt;path&gt;',
  usageFile: 'Usage: /file &lt;filepath&gt;',
  usageFolder: 'Usage: /folder &lt;name&gt;',
  usageCopy: 'Usage: /copy &lt;filename&gt;',
  usagePaste: 'Usage: /paste &lt;destination&gt;',
  usageRm: 'Usage: /rm &lt;path&gt;',
  usageCode: 'Usage: /code &lt;filename&gt;',
  setProjectFirst: 'Please set a project first.',
  outsideProject: 'Cannot access outside project directory.',
  outsideProjectCd: 'Cannot move outside project directory.\nUse /leave to unset the project.',
  outsideProjectCreate: 'Cannot create folder outside project directory.',
  outsideProjectCopy: 'Cannot copy files outside project directory.',
  outsideProjectPaste: 'Cannot paste outside project directory.',
  outsideProjectDelete: 'Cannot delete files outside project directory.',
  dirNotFound: (dir) => `❌ Directory not found: ${dir}`,
  movedTo: (dir) => `📂 Moved to: ${dir}`,
  movedToRoot: '📂 Moved to project root',
  deleteConfirm: '⚠️ Are you sure you want to delete?',
  deleteComplete: (name) => `✅ Deleted: ${name}`,
  deleteFailed: (msg) => `❌ Delete failed: ${msg}`,
  deleteExpired: 'Delete target has expired.',
  cancelled: 'Cancelled.',

  noProjects: 'No projects registered.\nUse /project &lt;full-path&gt; to add one.',
  selectProject: '📂 Select Project',
  projectSet: (name, full) => `✅ Project set: ${name} (${full})`,
  projectSwitched: (name, full) => `✅ Switched to: ${name}\n📂 ${full}`,
  projectNotFound: (name) => `❌ Project not found: ${name}\nUse /projects to see the list.`,
  projectListChanged: 'Project list has changed. Please use /projects again.',
  projectLeft: '📤 Project unset.\nUse /cd to navigate freely, then /project to set a new project.',

  noSessions: 'No sessions found. Send a message to auto-create one.',
  selectSession: '💬 Select Session',
  sessionConnected: '✅ Session connected.\nMessages will now be sent to this session.',
  recentChat: '📜 Recent messages:',
  newSessionStarted: '✅ New session started. Send a message to begin.',

  taskStarted: '⏳ Starting...',
  taskRunning: '⏳ A task is still running.\nUse /break to stop or wait for completion.',
  taskComplete: '✅ Complete',
  generating: '💭 Generating response...',
  changedFiles: '📁 Changed files:',
  filesDownload: '📎 Use /files to download changed files.',
  noChangedFiles: 'No changed files.',
  errorOccurred: (msg) => `❌ Error: ${msg}`,
  breakSuccess: '🛑 Task stopped.',
  breakNoTask: 'No running task.',
  projectNotSet: 'No project set.\nUse /project &lt;path&gt; or /projects to select one.',

  fileNotFound: (name) => `❌ File "${name}" not found.`,
  searchResults: (name, count) => `📂 Search "${name}" (${count} results)`,
  fileSendFailed: (msg) => `❌ File send failed: ${msg}`,
  fileReadFailed: (msg) => `❌ File read failed: ${msg}`,
  folderCreated: (name) => `✅ Folder created: ${name}`,
  copied: (p) => `📋 Copied: ${p}`,
  clipboardEmpty: 'Clipboard is empty. Use /copy first.',
  pasteComplete: (from, to) => `✅ Pasted: ${from} → ${to}`,
  codeExpired: 'Code view expired. Use /code to open again.',

  linesLabel: 'lines',
  prevPage: '◀ Prev',
  nextPage: 'Next ▶',

  deleteBtn: 'Delete',
  cancelBtn: 'Cancel',

  changeCreated: 'created',
  changeModified: 'modified',
  changeDeleted: 'deleted',
  sendFailed: (name) => `❌ Failed to send ${name}`,

  projectSetFromCwd: (name, full) => `✅ Project set: ${name} (${full})`,
  cdFirstThenProject: 'Navigate with /cd first, then use /project to set it.',

  toolTodoUpdate: 'Updating task list',
};

const messages: Record<Lang, Messages> = { ko, en };

export function t(lang: Lang): Messages {
  return messages[lang] || messages.ko;
}
