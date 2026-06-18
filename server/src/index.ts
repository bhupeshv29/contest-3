import "dotenv/config";
import cors from "cors";
import express from "express";
import { listProjectFiles, writeProjectFile } from "./projectFiles.js";
import type { Message, ProjectFile, ProjectSnapshot } from "./types.js";
import { generateWithOpenAI } from "./openai.js";
import { buildGeminiPrompt, createProjectSnapshot, getUserMessage, messageHistory, parseGeminiResponse } from "./utils.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

export const previewUrl = process.env.PROJECT_PREVIEW_URL ?? "http://localhost:5174";



export const systemPrompt = `You are an AI coding assistant editing a Vite React project.

Rules:
- You can only edit files inside project/.
- Prefer editing src/App.tsx and src/styles.css.
- Do not add auth, database, deployment, streaming, or package installation.
- Return ONLY valid JSON. No markdown. No explanation outside JSON.

JSON format:
{
  "assistantMessage": "short message for the user",
  "summary": "short summary of what changed",
  "files": [
    {
      "path": "src/App.tsx",
      "content": "complete new file content"
    }
  ]
}

Important:
- files must contain full file contents, not diffs.
- If no file change is needed, return files as an empty array.
`;


app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/project", async (_request, response, next) => {
  try {
    response.json(await createProjectSnapshot("Project loaded."));
  } catch (error) {
    console.log("error displaying message")
  }
});

app.post("/api/messages", async (request, response, next) => {
  try {
    const userMessage = getUserMessage(request.body);

    messageHistory.push({
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const filesBeforeChange = await listProjectFiles();
    const prompt = buildGeminiPrompt(userMessage, filesBeforeChange);
    const rawGeminiResponse = await generateWithOpenAI(prompt);
    const parsedResponse = parseGeminiResponse(rawGeminiResponse);

    for (const file of parsedResponse.files ?? []) {
      await writeProjectFile(file.path, file.content);
    }

    const assistantMessage =
      parsedResponse.assistantMessage ??
      parsedResponse.summary ??
      rawGeminiResponse ??
      "Done.";

    messageHistory.push({
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date().toISOString(),
    });

    response.json(await createProjectSnapshot(parsedResponse.summary ?? assistantMessage));
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
