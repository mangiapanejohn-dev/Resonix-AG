import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { restoreTerminalState } from "../terminal/restore.js";
import { runOnboardingWizard } from "../wizard/onboarding.js";
import { WizardCancelledError } from "../wizard/prompts.js";
import type { OnboardOptions } from "./onboard-types.js";

// Text-based prompter for non-TTY environments
async function askQuestion(question: string): Promise<string> {
  const readline = await import("node:readline");
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function createTextPrompter() {
  return {
    intro: async (title) => { console.log(`\n${title}\n`); },
    outro: async (message) => { console.log(`\n${message}\n`); },
    note: async (message, title) => { console.log(`\n${title || ""}: ${message}\n`); },
    select: async (params) => {
      console.log(`\n${params.message}\n`);
      params.options.forEach((opt, i) => { console.log(`  ${i + 1}. ${opt.label || opt.value}`); });
      const answer = await askQuestion(`Enter number (1-${params.options.length}): `);
      const index = parseInt(answer) - 1;
      return (index >= 0 && index < params.options.length) ? params.options[index].value : params.options[0].value;
    },
    text: async (params) => {
      const prompt = params.placeholder ? `${params.message} (${params.placeholder}): ` : `${params.message}: `;
      const answer = await askQuestion(prompt);
      return answer || params.initialValue || "";
    },
    confirm: async (params) => {
      const prompt = params.initialValue ? "Y/n: " : "y/N: ";
      const answer = await askQuestion(`${params.message} ${prompt}`);
      return answer.toLowerCase().startsWith("y");
    },
    progress: (label) => {
      console.log(`[...] ${label}`);
      return { update: (message) => console.log(`  ${message}`), stop: (message) => console.log(`[✓] ${message || "done"}`) };
    },
  };
}

export async function runInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  // Always use text prompter for now (simpler and works without TTY)
  const prompter = createTextPrompter();
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
