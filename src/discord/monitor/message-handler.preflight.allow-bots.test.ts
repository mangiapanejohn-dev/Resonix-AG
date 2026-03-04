import { describe, expect, it } from "vitest";
import { shouldProcessDiscordBotMessage } from "./message-handler.preflight.js";

describe("shouldProcessDiscordBotMessage", () => {
  it("always allows PluralKit bot senders", () => {
    const allowed = shouldProcessDiscordBotMessage({
      allowBots: false,
      senderIsPluralKit: true,
      explicitlyMentioned: false,
    });

    expect(allowed).toBe(true);
  });

  it("drops bot messages when allowBots is false", () => {
    const allowed = shouldProcessDiscordBotMessage({
      allowBots: false,
      senderIsPluralKit: false,
      explicitlyMentioned: true,
    });

    expect(allowed).toBe(false);
  });

  it("allows all bot messages when allowBots is true", () => {
    const allowed = shouldProcessDiscordBotMessage({
      allowBots: true,
      senderIsPluralKit: false,
      explicitlyMentioned: false,
    });

    expect(allowed).toBe(true);
  });

  it('allows only explicit mentions when allowBots is "mentions"', () => {
    const mentioned = shouldProcessDiscordBotMessage({
      allowBots: "mentions",
      senderIsPluralKit: false,
      explicitlyMentioned: true,
    });
    const notMentioned = shouldProcessDiscordBotMessage({
      allowBots: "mentions",
      senderIsPluralKit: false,
      explicitlyMentioned: false,
    });

    expect(mentioned).toBe(true);
    expect(notMentioned).toBe(false);
  });
});
