/** Path-resolution tests for the environment file (no file or network access). */
import { describe, expect, it } from "@jest/globals";
import path from "node:path";

import { resolveEnvFilePath } from "./envPath.js";

const root = path.resolve(path.sep, "repo-root");

/** Builds an `exists` stub that only knows the given absolute paths. */
const onlyExists = (...known: string[]) => {
  const normalized = new Set(known.map((candidate) => path.resolve(candidate)));
  return (candidate: string): boolean => normalized.has(path.resolve(candidate));
};

describe("resolveEnvFilePath", () => {
  it("finds config/.env from the source layout", () => {
    const moduleDir = path.join(root, "config");
    const target = path.join(root, "config", ".env");

    expect(resolveEnvFilePath(moduleDir, onlyExists(target), path.join(root, "elsewhere"))).toBe(target);
  });

  it("finds config/.env from the compiled dist layout", () => {
    const moduleDir = path.join(root, "dist", "src", "common", "utils");
    const target = path.join(root, "config", ".env");

    expect(resolveEnvFilePath(moduleDir, onlyExists(target), path.join(root, "elsewhere"))).toBe(target);
  });

  it("returns null when no environment file exists", () => {
    expect(resolveEnvFilePath(path.join(root, "src"), () => false, path.join(root, "cwd"))).toBeNull();
  });

  it("falls back to <cwd>/config/.env when the module is outside the repository", () => {
    const moduleDir = path.resolve(root, "..", "sibling-package", "src");
    const cwd = path.resolve(root, "..", "checkout");
    const target = path.join(cwd, "config", ".env");

    expect(resolveEnvFilePath(moduleDir, onlyExists(target), cwd)).toBe(target);
  });
});
