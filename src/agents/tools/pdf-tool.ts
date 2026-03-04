import path from "node:path";
import { Type } from "@sinclair/typebox";
import type { ResonixConfig } from "../../config/config.js";
import { extractFileContentFromSource, resolveInputFileLimits } from "../../media/input-files.js";
import { resolveUserPath } from "../../utils.js";
import { getDefaultLocalRoots, loadWebMediaRaw } from "../../web/media.js";
import type { SandboxFsBridge } from "../sandbox/fs-bridge.js";
import { normalizeWorkspaceDir } from "../workspace-dir.js";
import type { AnyAgentTool } from "./common.js";
import { readNumberParam, readStringParam, ToolInputError } from "./common.js";

type PdfSandboxConfig = {
  root: string;
  bridge: SandboxFsBridge;
};

function pickMaxBytes(cfg?: ResonixConfig, maxBytesMb?: number): number | undefined {
  if (typeof maxBytesMb === "number" && Number.isFinite(maxBytesMb) && maxBytesMb > 0) {
    return Math.floor(maxBytesMb * 1024 * 1024);
  }
  const configured = cfg?.agents?.defaults?.mediaMaxMb;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured * 1024 * 1024);
  }
  return undefined;
}

function buildLocalRoots(workspaceDir?: string): readonly string[] {
  const roots = getDefaultLocalRoots();
  const workspace = normalizeWorkspaceDir(workspaceDir);
  if (!workspace) {
    return roots;
  }
  return Array.from(new Set([...roots, workspace]));
}

async function resolveSandboxedPdfPath(params: {
  sandbox: PdfSandboxConfig;
  inputPath: string;
}): Promise<{ resolved: string; rewrittenFrom?: string }> {
  const normalize = (value: string) =>
    value.startsWith("file://") ? value.slice("file://".length) : value;
  const filePath = normalize(params.inputPath);
  try {
    const resolved = params.sandbox.bridge.resolvePath({
      filePath,
      cwd: params.sandbox.root,
    });
    return { resolved: resolved.hostPath };
  } catch (err) {
    const name = path.basename(filePath);
    const candidateRel = path.join("media", "inbound", name);
    try {
      const stat = await params.sandbox.bridge.stat({
        filePath: candidateRel,
        cwd: params.sandbox.root,
      });
      if (!stat) {
        throw err;
      }
    } catch {
      throw err;
    }
    const out = params.sandbox.bridge.resolvePath({
      filePath: candidateRel,
      cwd: params.sandbox.root,
    });
    return { resolved: out.hostPath, rewrittenFrom: filePath };
  }
}

export function createPdfExtractTool(options?: {
  config?: ResonixConfig;
  workspaceDir?: string;
  sandbox?: PdfSandboxConfig;
}): AnyAgentTool {
  const localRoots = buildLocalRoots(options?.workspaceDir);
  const sandboxConfig =
    options?.sandbox && options.sandbox.root.trim()
      ? { root: options.sandbox.root.trim(), bridge: options.sandbox.bridge }
      : null;

  return {
    label: "PDF Extract",
    name: "pdf_extract",
    description:
      "Extract text from a PDF (local path/file URL/http URL). For scanned PDFs, can return rendered page images for vision models.",
    parameters: Type.Object({
      source: Type.String({
        description: "PDF source path or URL.",
      }),
      includeImages: Type.Optional(
        Type.Boolean({
          description: "Include rendered page images when text extraction is insufficient.",
        }),
      ),
      maxPages: Type.Optional(Type.Number({ description: "Maximum PDF pages to process." })),
      maxChars: Type.Optional(Type.Number({ description: "Maximum extracted text characters." })),
      maxBytesMb: Type.Optional(Type.Number({ description: "Maximum PDF size in MB." })),
      maxPixels: Type.Optional(Type.Number({ description: "Maximum pixels per rendered page." })),
      minTextChars: Type.Optional(
        Type.Number({
          description: "Minimum text chars before falling back to rendered images.",
        }),
      ),
    }),
    execute: async (_toolCallId, args) => {
      const record = args && typeof args === "object" ? (args as Record<string, unknown>) : {};

      const sourceInput = readStringParam(record, "source", { required: true });
      const sourceRaw = sourceInput.startsWith("@") ? sourceInput.slice(1).trim() : sourceInput;
      if (!sourceRaw) {
        throw new ToolInputError("source required");
      }

      const includeImages = record.includeImages !== false;
      const maxPages = readNumberParam(record, "maxPages", { integer: true });
      const maxChars = readNumberParam(record, "maxChars", { integer: true });
      const maxPixels = readNumberParam(record, "maxPixels", { integer: true });
      const minTextChars = readNumberParam(record, "minTextChars", { integer: true });
      const maxBytesMb = readNumberParam(record, "maxBytesMb");

      const isHttpUrl = /^https?:\/\//i.test(sourceRaw);
      if (sandboxConfig && isHttpUrl) {
        throw new ToolInputError("Sandboxed pdf_extract does not allow remote URLs.");
      }

      const resolvedMaxBytes = pickMaxBytes(options?.config, maxBytesMb);
      const limits = resolveInputFileLimits({
        allowUrl: true,
        allowedMimes: ["application/pdf"],
        ...(typeof resolvedMaxBytes === "number" ? { maxBytes: resolvedMaxBytes } : {}),
        ...(typeof maxChars === "number" && maxChars > 0 ? { maxChars } : {}),
        pdf: {
          ...(typeof maxPages === "number" && maxPages > 0 ? { maxPages } : {}),
          ...(typeof maxPixels === "number" && maxPixels > 0 ? { maxPixels } : {}),
          ...(typeof minTextChars === "number" && minTextChars >= 0
            ? { minTextChars }
            : includeImages
              ? {}
              : { minTextChars: 0 }),
        },
      });

      const isFileUrl = sourceRaw.startsWith("file://");
      const resolvedSource = (() => {
        if (sandboxConfig) {
          return sourceRaw;
        }
        if (sourceRaw.startsWith("~")) {
          return resolveUserPath(sourceRaw);
        }
        return sourceRaw;
      })();

      let extracted: Awaited<ReturnType<typeof extractFileContentFromSource>>;
      let rewrittenFrom: string | undefined;

      if (isHttpUrl) {
        extracted = await extractFileContentFromSource({
          source: {
            type: "url",
            url: resolvedSource,
          },
          limits,
        });
      } else {
        const sandboxResolved = sandboxConfig
          ? await resolveSandboxedPdfPath({
              sandbox: sandboxConfig,
              inputPath: resolvedSource,
            })
          : null;
        const localPath = sandboxResolved
          ? sandboxResolved.resolved
          : isFileUrl
            ? resolvedSource.slice("file://".length)
            : resolvedSource;
        rewrittenFrom = sandboxResolved?.rewrittenFrom;

        const media = sandboxConfig
          ? await loadWebMediaRaw(localPath, {
              maxBytes: limits.maxBytes,
              sandboxValidated: true,
              readFile: (filePath) =>
                sandboxConfig.bridge.readFile({ filePath, cwd: sandboxConfig.root }),
            })
          : await loadWebMediaRaw(localPath, {
              maxBytes: limits.maxBytes,
              localRoots,
            });

        extracted = await extractFileContentFromSource({
          source: {
            type: "base64",
            data: media.buffer.toString("base64"),
            mediaType: media.contentType ?? "application/pdf",
            filename: (media.fileName ?? path.basename(localPath)) || "file.pdf",
          },
          limits,
        });
      }

      const text = extracted.text?.trim() ?? "";
      const extractedImages = extracted.images ?? [];
      const returnedImages = includeImages ? extractedImages : [];
      const summaryText = text
        ? text
        : extractedImages.length > 0
          ? "No embedded text found in PDF; page images were extracted."
          : "No extractable text found in PDF.";
      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
        { type: "text", text: summaryText },
      ];
      for (const image of returnedImages) {
        content.push({
          type: "image",
          data: image.data,
          mimeType: image.mimeType,
        });
      }

      return {
        content,
        details: {
          source: sourceRaw,
          filename: extracted.filename,
          textChars: text.length,
          extractedImagePages: extractedImages.length,
          returnedImagePages: returnedImages.length,
          ...(rewrittenFrom ? { rewrittenFrom } : {}),
        },
      };
    },
  };
}
