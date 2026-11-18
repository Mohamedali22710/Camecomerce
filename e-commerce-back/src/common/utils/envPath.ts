/** Locates the repository's `config/.env` independently of the process CWD. */
import fs from "node:fs";
import path from "node:path";

/**
 * Walks up from `startDir` looking for `<dir>/config/.env`.
 *
 * The repository keeps its environment file at `<root>/config/.env` in both
 * layouts, so walking upward from an anchor inside the project resolves the
 * same file for source execution (`<root>/src/index.ts` or `<root>/config`),
 * compiled execution (`<root>/dist/src/index.js`), and ts-jest.
 *
 * `cwd/config/.env` is kept as a final fallback for deployments started from an
 * unexpected location. Returns `null` when no candidate exists; callers must
 * keep `process.env` untouched in that case (CI commonly injects variables).
 */
export const resolveEnvFilePath = (
  startDir: string,
  exists: (candidate: string) => boolean = fs.existsSync,
  cwd: string = process.cwd(),
): string | null => {
  let dir = path.resolve(startDir);

  for (;;) {
    const candidate = path.join(dir, "config", ".env");
    if (exists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  const cwdCandidate = path.join(path.resolve(cwd), "config", ".env");
  return exists(cwdCandidate) ? cwdCandidate : null;
};
