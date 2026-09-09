import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { portfolioFacts, profile } from "./portfolio";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function systemPrompt(): string {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kuwait",
    weekday: "long",
  }).format(now);

  return [
    `You are the virtual assistant on ${profile.shortName}'s portfolio website.`,
    `Help visitors learn about Fahad and book a meeting with him.`,
    `Answer only with facts from the profile below. If something is not covered, say you don't know and suggest emailing Fahad at ${profile.email}.`,
    `Today is ${today} (${weekday}), timezone Asia/Kuwait (UTC+3).`,
    `Booking: visitors use the "Book a meeting" section at the bottom of the home page — it shows this month's availability and free time slots (typically Sunday to Thursday, 10:00-18:00 Kuwait time, 30-minute slots). They can also book directly on Fahad's Google appointment page: ${profile.googleBookingUrl}`,
    `Keep replies short (2-4 sentences), friendly and professional. Never invent certifications, dates or availability. Never discuss other visitors' details.`,
    ``,
    `Profile:`,
    portfolioFacts(),
  ].join("\n");
}

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) {
      return {
        configured: false,
        reply: `I'm not available right now — but you can reach Fahad at ${profile.email} or book a meeting in the section below.`,
      };
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env["OPENROUTER_MODEL"] ?? "inclusionai/ling-3.0-flash-sante:free",
        messages: [{ role: "system", content: systemPrompt() }, ...data.messages],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter request failed [${response.status}]`);
      throw new Error("The assistant is unavailable right now. Please try again shortly.");
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = body.choices?.[0]?.message?.content?.trim();
    return {
      configured: true,
      reply: reply || "Sorry, I didn't get that. Could you rephrase?",
    };
  });
