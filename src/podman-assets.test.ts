import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveResonixPackageRootSync } from "./infra/resonix-root.js";

const packageRoot =
  resolveResonixPackageRootSync({
    cwd: process.cwd(),
    moduleUrl: import.meta.url,
  }) ?? process.cwd();

describe("podman deployment assets", () => {
  it("setup script references existing resonix podman files", async () => {
    const setupPath = path.join(packageRoot, "setup-podman.sh");
    const setup = await fs.readFile(setupPath, "utf-8");

    expect(setup).toContain("scripts/run-resonix-podman.sh");
    expect(setup).toContain("scripts/podman/resonix.container.in");

    await expect(
      fs.access(path.join(packageRoot, "scripts", "run-resonix-podman.sh")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(packageRoot, "scripts", "podman", "resonix.container.in")),
    ).resolves.toBeUndefined();
  });

  it("legacy run-openclaw script forwards to run-resonix script", async () => {
    const legacyPath = path.join(packageRoot, "scripts", "run-openclaw-podman.sh");
    const legacy = await fs.readFile(legacyPath, "utf-8");
    expect(legacy).toMatch(/run-resonix-podman\.sh/);
  });

  it("resonix quadlet template uses resonix placeholder and names", async () => {
    const templatePath = path.join(packageRoot, "scripts", "podman", "resonix.container.in");
    const template = await fs.readFile(templatePath, "utf-8");
    expect(template).toContain("{{RESONIX_HOME}}");
    expect(template).toContain("ContainerName=resonix");
    expect(template).toContain("Image=resonix:local");
    expect(template).not.toContain("{{OPENCLAW_HOME}}");
  });
});
