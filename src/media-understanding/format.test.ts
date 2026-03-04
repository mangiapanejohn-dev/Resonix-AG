import { describe, expect, it } from "vitest";
import { formatAudioTranscriptEcho, formatMediaUnderstandingBody } from "./format.js";

describe("formatMediaUnderstandingBody", () => {
  it("replaces placeholder body with transcript", () => {
    const body = formatMediaUnderstandingBody({
      body: "<media:audio>",
      outputs: [
        {
          kind: "audio.transcription",
          attachmentIndex: 0,
          text: "hello world",
          provider: "groq",
        },
      ],
    });
    expect(body).toBe("[Audio]\nTranscript:\nhello world");
  });

  it("includes user text when body is meaningful", () => {
    const body = formatMediaUnderstandingBody({
      body: "caption here",
      outputs: [
        {
          kind: "audio.transcription",
          attachmentIndex: 0,
          text: "transcribed",
          provider: "groq",
        },
      ],
    });
    expect(body).toBe("[Audio]\nUser text:\ncaption here\nTranscript:\ntranscribed");
  });

  it("strips leading media placeholders from user text", () => {
    const body = formatMediaUnderstandingBody({
      body: "<media:audio> caption here",
      outputs: [
        {
          kind: "audio.transcription",
          attachmentIndex: 0,
          text: "transcribed",
          provider: "groq",
        },
      ],
    });
    expect(body).toBe("[Audio]\nUser text:\ncaption here\nTranscript:\ntranscribed");
  });

  it("keeps user text once when multiple outputs exist", () => {
    const body = formatMediaUnderstandingBody({
      body: "caption here",
      outputs: [
        {
          kind: "audio.transcription",
          attachmentIndex: 0,
          text: "audio text",
          provider: "groq",
        },
        {
          kind: "video.description",
          attachmentIndex: 1,
          text: "video text",
          provider: "google",
        },
      ],
    });
    expect(body).toBe(
      [
        "User text:\ncaption here",
        "[Audio]\nTranscript:\naudio text",
        "[Video]\nDescription:\nvideo text",
      ].join("\n\n"),
    );
  });

  it("formats image outputs", () => {
    const body = formatMediaUnderstandingBody({
      body: "<media:image>",
      outputs: [
        {
          kind: "image.description",
          attachmentIndex: 0,
          text: "a cat",
          provider: "openai",
        },
      ],
    });
    expect(body).toBe("[Image]\nDescription:\na cat");
  });
});

describe("formatAudioTranscriptEcho", () => {
  it("uses default template when custom format is missing", () => {
    expect(formatAudioTranscriptEcho({ transcript: "hello world" })).toBe("Heard: hello world");
  });

  it("replaces transcript placeholder in custom templates", () => {
    expect(
      formatAudioTranscriptEcho({
        transcript: "hello world",
        format: "Transcript check: {transcript}",
      }),
    ).toBe("Transcript check: hello world");
  });

  it("appends transcript when custom format omits the placeholder", () => {
    expect(
      formatAudioTranscriptEcho({
        transcript: "hello world",
        format: "Transcript check",
      }),
    ).toBe("Transcript check\nhello world");
  });
});
