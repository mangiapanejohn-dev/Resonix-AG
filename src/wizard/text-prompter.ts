import type { WizardPrompter } from "./prompts.js";

// Simple text-based prompter for non-TTY environments
export function createTextPrompter(): WizardPrompter {
  return {
    intro: async (title) => {
      console.log(`\n${title}\n`);
    },
    outro: async (message) => {
      console.log(`\n${message}\n`);
    },
    note: async (message, title) => {
      if (title) console.log(`\n${title}: ${message}\n`);
      else console.log(`\n${message}\n`);
    },
    select: async (params) => {
      console.log(`\n${params.message}\n`);
      params.options.forEach((opt, i) => {
        const label = typeof opt.label === "string" ? opt.label : String(opt.value);
        console.log(`  ${i + 1}. ${label}`);
      });
      const answer = await askQuestion(`Enter number (1-${params.options.length}): `);
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < params.options.length) {
        return params.options[index].value;
      }
      return params.options[0].value;
    },
    multiselect: async (params) => {
      console.log(`\n${params.message}\n`);
      console.log("Enter numbers separated by commas (e.g., 1,3):");
      params.options.forEach((opt, i) => {
        const label = typeof opt.label === "string" ? opt.label : String(opt.value);
        console.log(`  ${i + 1}. ${label}`);
      });
      const answer = await askQuestion(`Enter numbers: `);
      const indices = answer.split(",").map((s) => parseInt(s.trim()) - 1).filter((i) => i >= 0);
      return params.options.filter((_, i) => indices.includes(i)).map((opt) => opt.value);
    },
    text: async (params) => {
      const prompt = params.placeholder
        ? `${params.message} (${params.placeholder}): `
        : `${params.message}: `;
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
      return {
        update: (message) => console.log(`  ${message}`),
        stop: (message) => console.log(`[✓] ${message || "done"}`),
      };
    },
  };
}

async function askQuestion(question: string): Promise<string> {
  const readline = await import("node:readline");
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Check if we have a TTY - use clack if yes, use text fallback if no
function hasTTY(): boolean {
  return process.stdin.isTTY === true;
}

// Export combined prompter that uses text fallback when no TTY
let cachedPrompter: WizardPrompter | null = null;

export function createPrompterWithFallback(): WizardPrompter {
  if (cachedPrompter) return cachedPrompter;

  if (hasTTY()) {
    // Use clack prompter when TTY is available
    const { createClackPrompter } = require("./clack-prompter.js");
    cachedPrompter = createClackPrompter();
  } else {
    // Use text prompter when no TTY
    cachedPrompter = createTextPrompter();
  }

  return cachedPrompter;
}
