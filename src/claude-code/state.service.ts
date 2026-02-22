import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  UserState,
  FileChange,
  StateStore,
} from './interfaces/session.interface';

const STATE_DIR = path.join(os.homedir(), '.telegram-claude');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const PROJECTS_FILE = path.join(STATE_DIR, 'projects.json');

@Injectable()
export class StateService implements OnModuleInit {
  private readonly logger = new Logger(StateService.name);
  private states: StateStore = {};
  private projects: string[] = [];
  private lastChangedFiles = new Map<string, FileChange[]>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.loadState();
    this.loadProjects();
  }

  // --- User State ---

  getState(chatId: string): UserState {
    if (!this.states[chatId]) {
      const defaultProject =
        this.configService.get<string>('claude.defaultProjectPath') || null;
      this.states[chatId] = {
        projectPath: defaultProject,
        sessionId: null,
        cwd: defaultProject,
        clipboard: null,
        lang: 'ko',
        lastUsed: new Date().toISOString(),
      };
      this.saveState();
    }
    return this.states[chatId];
  }

  switchProject(chatId: string, projectPath: string) {
    const state = this.getState(chatId);
    state.projectPath = projectPath;
    state.cwd = projectPath;
    state.sessionId = null;
    state.lastUsed = new Date().toISOString();
    this.saveState();
  }

  setSession(chatId: string, sessionId: string) {
    const state = this.getState(chatId);
    state.sessionId = sessionId;
    state.lastUsed = new Date().toISOString();
    this.saveState();
  }

  clearSession(chatId: string) {
    const state = this.getState(chatId);
    state.sessionId = null;
    state.lastUsed = new Date().toISOString();
    this.saveState();
  }

  clearProject(chatId: string) {
    const state = this.getState(chatId);
    state.projectPath = null;
    state.sessionId = null;
    state.cwd = null;
    state.lastUsed = new Date().toISOString();
    this.saveState();
  }

  setCwd(chatId: string, cwd: string) {
    const state = this.getState(chatId);
    state.cwd = cwd;
    this.saveState();
  }

  setClipboard(chatId: string, filePath: string) {
    const state = this.getState(chatId);
    state.clipboard = filePath;
    this.saveState();
  }

  setLang(chatId: string, lang: 'ko' | 'en') {
    const state = this.getState(chatId);
    state.lang = lang;
    this.saveState();
  }

  getLang(chatId: string): 'ko' | 'en' {
    return this.getState(chatId).lang || 'ko';
  }

  // --- Changed Files ---

  setLastChangedFiles(chatId: string, files: FileChange[]) {
    this.lastChangedFiles.set(chatId, files);
  }

  getLastChangedFiles(chatId: string): FileChange[] {
    return this.lastChangedFiles.get(chatId) || [];
  }

  // --- Projects ---

  getProjects(): string[] {
    return this.projects;
  }

  registerProject(projectPath: string) {
    if (!this.projects.includes(projectPath)) {
      this.projects.push(projectPath);
      this.saveProjects();
    }
  }

  // --- Persistence ---

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        this.states = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        this.logger.log(
          `Loaded state for ${Object.keys(this.states).length} users`,
        );
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load state: ${error.message}`);
    }
  }

  private saveState() {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.states, null, 2));
    } catch (error: any) {
      this.logger.error(`Failed to save state: ${error.message}`);
    }
  }

  private loadProjects() {
    try {
      if (fs.existsSync(PROJECTS_FILE)) {
        this.projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load projects: ${error.message}`);
    }
  }

  private saveProjects() {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      fs.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify(this.projects, null, 2),
      );
    } catch (error: any) {
      this.logger.error(`Failed to save projects: ${error.message}`);
    }
  }
}
