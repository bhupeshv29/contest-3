import {mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectFile } from "./types.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, "../../project");

const editableExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".ts",
  ".tsx",
]);
const ignoredDirectories = new Set(["node_modules", "dist", ".vite"]);

export async function listProjectFiles(): Promise<ProjectFile[]> {
  const paths = await walkProject(projectRoot);
  const files = await Promise.all(
    paths.map(async (filePath) => ({
      path: toProjectPath(filePath),
      content: await readFile(filePath, "utf8"),
    })),
  );

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function walkProject(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await walkProject(fullPath)));
      }
      continue;
    }

    if (entry.isFile() && editableExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toProjectPath(filePath: string) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}


export async function writeProjectFile(
  projectPath: string,
  content: string,
): Promise<void> {
  const safePath = resolveProjectPath(projectPath);
  await mkdir(path.dirname(safePath), { recursive: true });
  await writeFile(safePath, content, "utf8");
}


function resolveProjectPath(projectPath: string): string {
  if (!projectPath || projectPath.includes("\0")) {
    throw new Error("Invalid file path");
  }

  const normalizedPath = projectPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(projectRoot, normalizedPath);
  const relativePath = path.relative(projectRoot, resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    ignoredDirectories.has(relativePath.split(path.sep)[0])
  ) {
    throw new Error(`File path is outside project/: ${projectPath}`);
  }

  const extension = path.extname(resolvedPath);
  if (!editableExtensions.has(extension)) {
    throw new Error(`File type is not editable: ${projectPath}`);
  }

  return resolvedPath;
}
