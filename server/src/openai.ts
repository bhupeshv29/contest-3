import 'dotenv/config';
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY
const modelName = process.env.OPENAI_MODEL ?? "gpt-5.5";

export async function generateWithOpenAI(prompt: string): Promise<string> {

  if (!apiKey) {
    return "Mock mode: OPENAI_API_KEY is not configured, so no files were changed.";
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: modelName,
    messages: [{ role: "user", content: prompt }],
  });
  // console.log(response.choices[0]?.message?.content ?? "");
  return response.choices[0]?.message?.content ?? "";
}
