import * as path from 'path';
import * as os from 'os';

export function expandTilde(p: string): string {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export function isWithinProject(
  targetPath: string,
  projectPath: string,
): boolean {
  const resolved = path.resolve(targetPath);
  const project = path.resolve(projectPath);
  return resolved === project || resolved.startsWith(project + path.sep);
}

export function resolveSecurePath(
  basePath: string,
  relativePath: string,
  projectPath: string,
): string | null {
  const resolved = path.resolve(basePath, relativePath);
  if (!isWithinProject(resolved, projectPath)) return null;
  return resolved;
}
