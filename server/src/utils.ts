import { systemPrompt } from "./index.js";
import { listProjectFiles } from "./projectFiles.js";
import { Message, ProjectFile, ProjectSnapshot } from "./types.js";
export const previewUrl = process.env.PROJECT_PREVIEW_URL ?? "http://localhost:5174";

export const messageHistory: Message[] = [];

export async function createProjectSnapshot(summary: string): Promise<ProjectSnapshot> {
  return {
    summary,
    messageHistory,
    files: await listProjectFiles(),
    updatedAt: new Date().toISOString(),
    previewUrl,
  };
}

type GeminiEditResponse = {
  assistantMessage?: string;
  summary?: string;
  files?: ProjectFile[];
};


export function getUserMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  const message = (body as { message?: unknown; content?: unknown }).message ??
    (body as { message?: unknown; content?: unknown }).content;

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("message is required");
  }

  return message.trim();
}

export function buildGeminiPrompt(userMessage: string, files: ProjectFile[]): string {
  const recentHistory = messageHistory

  return `${systemPrompt}

Conversation history:
${JSON.stringify(recentHistory, null, 2)}

Current user request:
${userMessage}

Current project files:
${files
  .map(
    (file) => `--- ${file.path} ---\n${file.content}`,
  )
  .join("\n\n")}
`;
}

export function parseGeminiResponse(rawResponse: string): GeminiEditResponse {
  const text = rawResponse.trim();

  if (!text) {
    return {
      assistantMessage: "No response received from Gemini.",
      summary: "No changes made.",
      files: [],
    };
  }

  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    return {
      assistantMessage: text,
      summary: text,
      files: [],
    };
  }

  const parsed = JSON.parse(jsonText) as GeminiEditResponse;

  return {
    assistantMessage: parsed.assistantMessage ?? parsed.summary ?? "Done.",
    summary: parsed.summary ?? parsed.assistantMessage ?? "Project updated.",
    files: Array.isArray(parsed.files) ? parsed.files : [],
  };
}

export function extractJsonObject(text: string): string | null {
  const withoutCodeFence = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (withoutCodeFence.startsWith("{") && withoutCodeFence.endsWith("}")) {
    return withoutCodeFence;
  }
  return withoutCodeFence
}
