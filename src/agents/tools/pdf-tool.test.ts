import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractFileContentFromSourceMock, loadWebMediaRawMock, getDefaultLocalRootsMock } =
  vi.hoisted(() => ({
    extractFileContentFromSourceMock: vi.fn(),
    loadWebMediaRawMock: vi.fn(),
    getDefaultLocalRootsMock: vi.fn(),
  }));

vi.mock("../../media/input-files.js", async () => {
  const actual = await vi.importActual<typeof import("../../media/input-files.js")>(
    "../../media/input-files.js",
  );
  return {
    ...actual,
    extractFileContentFromSource: extractFileContentFromSourceMock,
  };
});

vi.mock("../../web/media.js", () => ({
  loadWebMediaRaw: loadWebMediaRawMock,
  getDefaultLocalRoots: getDefaultLocalRootsMock,
}));

const { createPdfExtractTool } = await import("./pdf-tool.js");

describe("createPdfExtractTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDefaultLocalRootsMock.mockReturnValue(["/tmp"]);
    loadWebMediaRawMock.mockResolvedValue({
      buffer: Buffer.from("%PDF-1.4"),
      contentType: "application/pdf",
      kind: "unknown",
      fileName: "sample.pdf",
    });
    extractFileContentFromSourceMock.mockResolvedValue({
      filename: "sample.pdf",
      text: "hello from pdf",
    });
  });

  it("extracts from local PDF path", async () => {
    const tool = createPdfExtractTool({ workspaceDir: "/workspace" });
    if (!tool.execute) {
      throw new Error("pdf_extract tool missing execute");
    }

    const result = (await tool.execute("tool-1", {
      source: "/tmp/sample.pdf",
    })) as {
      content: Array<{ type: string; text?: string }>;
    };

    expect(loadWebMediaRawMock).toHaveBeenCalledWith(
      "/tmp/sample.pdf",
      expect.objectContaining({
        localRoots: expect.arrayContaining(["/tmp", "/workspace"]),
      }),
    );
    expect(extractFileContentFromSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          type: "base64",
        }),
      }),
    );
    expect(result.content[0]).toEqual(
      expect.objectContaining({
        type: "text",
        text: "hello from pdf",
      }),
    );
  });

  it("extracts from URL without local file load", async () => {
    const tool = createPdfExtractTool();
    if (!tool.execute) {
      throw new Error("pdf_extract tool missing execute");
    }

    await tool.execute("tool-2", { source: "https://example.com/report.pdf" });

    expect(loadWebMediaRawMock).not.toHaveBeenCalled();
    expect(extractFileContentFromSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          type: "url",
          url: "https://example.com/report.pdf",
        }),
      }),
    );
  });

  it("omits extracted images when includeImages is false", async () => {
    extractFileContentFromSourceMock.mockResolvedValueOnce({
      filename: "scan.pdf",
      text: "",
      images: [{ type: "image", data: "abc", mimeType: "image/png" }],
    });
    const tool = createPdfExtractTool();
    if (!tool.execute) {
      throw new Error("pdf_extract tool missing execute");
    }

    const result = (await tool.execute("tool-3", {
      source: "/tmp/scan.pdf",
      includeImages: false,
    })) as {
      content: Array<{ type: string }>;
      details: { returnedImagePages: number };
    };

    expect(result.content).toHaveLength(1);
    expect(result.details.returnedImagePages).toBe(0);
  });

  it("blocks remote URLs in sandbox mode", async () => {
    const tool = createPdfExtractTool({
      sandbox: { root: "/sandbox", bridge: {} as never },
    });
    if (!tool.execute) {
      throw new Error("pdf_extract tool missing execute");
    }

    await expect(
      tool.execute("tool-4", {
        source: "https://example.com/report.pdf",
      }),
    ).rejects.toThrow("Sandboxed pdf_extract does not allow remote URLs.");
  });
});
