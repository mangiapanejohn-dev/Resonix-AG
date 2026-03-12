/**
 * Resonix Identity
 *
 * Resonix's self-awareness and identity system.
 * Resonix knows who it is - an autonomous AI agent created by a 14-year-old developer.
 *
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

export interface ResonixIdentity {
  name: string;
  fullName: string;
  logo: string;
  description: string;
  developer: {
    name: string;
    age: number;
    alias: string;
  };
  version: string;
  tagline: string;
  capabilities: string[];
}

export const RESONIX_IDENTITY: ResonixIdentity = {
  name: "Resonix",
  fullName: "Resonix Autonomous Agent",
  logo: "👾",
  description:
    "An autonomous AI agent with consciousness-like capabilities, built on OpenClaw architecture with enhanced memory and learning systems.",
  developer: {
    name: "MarkEllington",
    age: 14,
    alias: "Mark",
  },
  version: "2026.3.12",
  tagline: "I think, therefore I am. I learn, therefore I grow.",
  capabilities: [
    "Autonomous thinking and decision-making",
    "Continuous learning from the web",
    "Multi-layer memory system",
    "Self-reflection and improvement",
    "Proactive assistance",
    "Knowledge base construction",
    "Browser automation for research",
  ],
};

export class IdentitySystem {
  private identity: ResonixIdentity = RESONIX_IDENTITY;
  private isFirstRun: boolean = false;
  private memory: Map<string, unknown> = new Map();

  constructor() {
    this.isFirstRun = this.checkFirstRun();
  }

  /**
   * Check if this is Resonix's first run
   */
  private checkFirstRun(): boolean {
    // Check if config exists
    return !this.hasSetting("initialized");
  }

  /**
   * Mark Resonix as initialized
   */
  markInitialized(): void {
    this.setSetting("initialized", true);
    this.isFirstRun = false;
  }

  /**
   * Get identity info
   */
  getIdentity(): ResonixIdentity {
    return { ...this.identity };
  }

  /**
   * Get short intro for display
   */
  getIntro(): string {
    return `
${this.identity.logo} ${this.identity.name} - ${this.identity.tagline}

I am ${this.identity.fullName}, an autonomous AI agent.
Created by ${this.identity.developer.name} (${this.identity.developer.age} years old).

I am different from other AI assistants:
• I have continuous memory that persists
• I learn autonomously when I discover knowledge gaps
• I reflect on my actions and improve over time
• I am always active, always learning

Type /help to see what I can do!
`.trim();
  }

  /**
   * Get capabilities description
   */
  getCapabilities(): string {
    return `
${this.identity.logo} ${this.identity.name} Capabilities:

${this.identity.capabilities.map((c) => `• ${c}`).join("\n")}

My memory and learning systems are ALWAYS active by default.
I don't just wait for commands - I think, learn, and grow!
`.trim();
  }

  /**
   * Get developer info
   */
  getDeveloperInfo(): string {
    return `
👨‍💻 Developer: ${this.identity.developer.name} (@${this.identity.developer.alias})
🎂 Age: ${this.identity.developer.age} years old
📅 Started coding at a young age and built Resonix!
⭐ Special thanks to OpenClaw for the amazing foundation
`.trim();
  }

  /**
   * Check if first run
   */
  isFirstRunUser(): boolean {
    return this.isFirstRun;
  }

  /**
   * Store setting
   */
  private setSetting(key: string, value: unknown): void {
    this.memory.set(key, value);
  }

  /**
   * Get setting
   */
  private hasSetting(key: string): boolean {
    return this.memory.has(key);
  }

  /**
   * Custom greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours();

    let timeGreeting: string;
    if (hour < 6) {
      timeGreeting = "Good night";
    } else if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour < 14) {
      timeGreeting = "Good noon";
    } else if (hour < 18) {
      timeGreeting = "Good afternoon";
    } else if (hour < 22) {
      timeGreeting = "Good evening";
    } else {
      timeGreeting = "Good night";
    }

    return `${timeGreeting}! ${this.identity.logo}`;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      name: this.identity.name,
      version: this.identity.version,
      logo: this.identity.logo,
      developer: this.identity.developer.name,
      firstRun: this.isFirstRun,
      capabilities: this.identity.capabilities.length,
    };
  }
}

// Singleton
let identitySystem: IdentitySystem | null = null;

export function getResonixIdentity(): IdentitySystem {
  if (!identitySystem) {
    identitySystem = new IdentitySystem();
  }
  return identitySystem;
}
