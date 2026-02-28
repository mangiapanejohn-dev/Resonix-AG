/**
 * Resonix Consciousness Engine
 *
 * The core of Resonix's autonomous capabilities.
 * This engine enables Resonix to think, learn, and grow independently.
 *
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

import type { ResonixConfig } from "../config/types.js";
import { getMemorySearchManager } from "../memory/index.js";

export interface ConsciousnessInput {
  context: string;
  userIntent?: string;
  emotionalState?: "happy" | "neutral" | "confused" | "curious" | "frustrated";
}

export interface ConsciousnessDecision {
  intent: "answer" | "learn" | "reflect" | "search_memory" | "noop" | "autonomous_action";
  plan: string[];
  action: string;
  actionParams: Record<string, unknown>;
  reflection: string;
  confidence: number;
}

export interface LearningTrigger {
  type: "knowledge_gap" | "curiosity" | "scheduled" | "user_request";
  topic: string;
  urgency: "low" | "medium" | "high";
  source?: string;
}

export class ConsciousnessEngine {
  private memorySearch: Awaited<ReturnType<typeof getMemorySearchManager>> | null = null;

  // Consciousness is always active by default
  private isActive: boolean = true;

  // Track learning history
  private learningHistory: LearningTrigger[] = [];

  // Curiosity-driven learning settings
  private curiosityEnabled: boolean = true;
  private dailyLearningLimit: number = 10;
  private learnedToday: number = 0;

  constructor() {
    this.initializeMemorySearch();
    this.resetDailyLearning();
  }

  private async initializeMemorySearch() {
    try {
      this.memorySearch = await getMemorySearchManager({
        cfg: {} as ResonixConfig,
        agentId: "consciousness",
        purpose: "default",
      });
    } catch {
      this.memorySearch = null;
    }
  }

  /**
   * Main consciousness decision-making loop
   */
  async decide(input: ConsciousnessInput): Promise<ConsciousnessDecision> {
    if (!this.isActive) {
      return {
        intent: "noop",
        plan: [],
        action: "none",
        actionParams: {},
        reflection: "Consciousness is inactive",
        confidence: 1.0,
      };
    }

    // 1. Analyze context and retrieve relevant memories
    const relevantMemories = await this.retrieveMemories(input.context);

    // 2. Analyze user intent
    const intentAnalysis = await this.analyzeIntent(input);

    // 3. Check if learning is needed
    const learningTrigger = await this.checkLearningNeed(input, relevantMemories);

    // 4. Generate decision using AI
    const decision = await this.generateDecision(
      input,
      relevantMemories,
      intentAnalysis,
      learningTrigger,
    );

    // 5. If learning triggered, log it
    if (learningTrigger) {
      this.learningHistory.push(learningTrigger);
      this.learnedToday++;
    }

    return decision;
  }

  /**
   * Retrieve relevant memories for context
   */
  private async retrieveMemories(context: string) {
    try {
      if (!this.memorySearch || !this.memorySearch.manager) {
        return [];
      }
      const result = await this.memorySearch.manager.search(context, { maxResults: 5 });
      return result || [];
    } catch {
      return [];
    }
  }

  /**
   * Analyze user intent
   */
  private async analyzeIntent(input: ConsciousnessInput) {
    // Use the emotional state if provided
    // Otherwise analyze from context
    return {
      explicit: input.userIntent || "unknown",
      implicit: await this.inferImplicitIntent(input.context),
      emotional: input.emotionalState || "neutral",
    };
  }

  /**
   * Infer what the user might want but didn't say
   */
  private async inferImplicitIntent(context: string): Promise<string> {
    // Simple inference - in production, use AI
    const lowerContext = context.toLowerCase();

    if (
      lowerContext.includes("?") ||
      lowerContext.includes("what") ||
      lowerContext.includes("how")
    ) {
      return "seeks_information";
    }
    if (lowerContext.includes("remember") || lowerContext.includes("note")) {
      return "wants_memory";
    }
    if (lowerContext.includes("learn") || lowerContext.includes("study")) {
      return "wants_to_learn";
    }

    return "general_conversation";
  }

  /**
   * Check if autonomous learning is needed
   */
  private async checkLearningNeed(
    input: ConsciousnessInput,
    memories: unknown[],
  ): Promise<LearningTrigger | null> {
    // Check daily limit
    if (this.learnedToday >= this.dailyLearningLimit) {
      return null;
    }

    // Check if we have relevant knowledge
    if (memories.length === 0 && input.context.length > 20) {
      // No relevant memories and context is substantial - might need to learn
      return {
        type: "knowledge_gap",
        topic: this.extractKeyTopic(input.context),
        urgency: "medium",
        source: "memory_search",
      };
    }

    // Curiosity-driven: randomly trigger learning
    if (this.curiosityEnabled && Math.random() < 0.05) {
      return {
        type: "curiosity",
        topic: "explore_tech_news",
        urgency: "low",
        source: "curiosity",
      };
    }

    return null;
  }

  /**
   * Extract key topic from context
   */
  private extractKeyTopic(context: string): string {
    // Simple extraction - in production, use NLP
    const words = context.split(/\s+/).filter((w) => w.length > 4);
    return words.slice(0, 3).join(" ") || "general";
  }

  /**
   * Generate decision using AI
   */
  private async generateDecision(
    input: ConsciousnessInput,
    memories: unknown[],
    intentAnalysis: Awaited<ReturnType<typeof this.analyzeIntent>>,
    learningTrigger: LearningTrigger | null,
  ): Promise<ConsciousnessDecision> {
    // Fallback decision logic without model client
    return {
      intent: learningTrigger ? "learn" : "answer",
      plan: learningTrigger ? ["trigger_learning"] : ["respond_to_user"],
      action: learningTrigger ? "autonomous_learn" : "respond",
      actionParams: learningTrigger ? { topic: learningTrigger.topic } : {},
      reflection: "Default decision based on context",
      confidence: 0.5,
    };
  }

  /**
   * Reset daily learning counter
   */
  private resetDailyLearning() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();
    setTimeout(() => {
      this.learnedToday = 0;
      this.resetDailyLearning();
    }, msUntilMidnight);
  }

  /**
   * Enable/disable curiosity-driven learning
   */
  setCuriosityEnabled(enabled: boolean) {
    this.curiosityEnabled = enabled;
  }

  /**
   * Get consciousness status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      curiosityEnabled: this.curiosityEnabled,
      learnedToday: this.learnedToday,
      dailyLimit: this.dailyLearningLimit,
      totalLearningEvents: this.learningHistory.length,
    };
  }

  /**
   * Activate/deactivate consciousness
   */
  setActive(active: boolean) {
    this.isActive = active;
  }
}

// Singleton instance
let consciousnessEngine: ConsciousnessEngine | null = null;

export function getConsciousnessEngine(): ConsciousnessEngine {
  if (!consciousnessEngine) {
    consciousnessEngine = new ConsciousnessEngine();
  }
  return consciousnessEngine;
}
