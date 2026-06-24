import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model, systemPrompt, userMessage } = await request.json();

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return NextResponse.json({ error: "No API key provided" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: apiKey.trim() });

    const message = await client.messages.create({
      model: typeof model === "string" && model.trim() ? model.trim() : "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt ?? "",
      messages: [{ role: "user", content: userMessage ?? "" }],
    });

    const result = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
