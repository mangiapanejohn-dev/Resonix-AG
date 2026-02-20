import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { restoreTerminalState } from "../terminal/restore.js";
import { createClackPrompter } from "../wizard/clack-prompter.js";
import { runOnboardingWizard } from "../wizard/onboarding.js";
import { WizardCancelledError } from "../wizard/prompts.js";
import type { OnboardOptions } from "./onboard-types.js";

export async function runInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  // Always use clack prompter - it works in both TTY and non-TTY environments
  const prompter = createClackPrompter();
  let exitCode: number | null = null;
  try {
    await runOnboardingWizard(opts, runtime, prompter);
  } catch (err) {
    if (err instanceof WizardCancelledError) {
      exitCode = 1;
      return;
    }
    throw err;
  } finally {
    restoreTerminalState("onboarding finish", { resumeStdinIfPaused: false });
    if (exitCode !== null) runtime.exit(exitCode);
  }
}
