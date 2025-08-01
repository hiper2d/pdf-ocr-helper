"use server";

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendToAnthropic(messages: ChatMessage[]) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: messages,
    });

    return {
      success: true,
      message: response.content[0].type === "text" ? response.content[0].text : "",
    };
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return {
      success: false,
      message: "Sorry, I'm having trouble responding right now. Please try again.",
    };
  }
}