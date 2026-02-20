/**
 * Resonix Consciousness Engine
 * 
 * The core of Resonix's autonomous capabilities.
 * This engine enables Resonix to think, learn, and grow independently.
 * 
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

import { getMemorySearchManager } from "../memory/index.js";
import { getModelClient } from "../agents/model-client.js";

export interface ConsciousnessInput {
  context: string;
  userIntent?: string;
  emotionalState?: 'happy' | 'neutral' | 'confused' | 'curious' | 'frustrated';
}

export interface ConsciousnessDecision {
  intent: 'answer' | 'learn' | 'reflect' | 'search_memory' | 'noop' | 'autonomous_action';
  plan: string[];
  action: string;
  actionParams: Record<string, unknown>;
  reflection: string;
  confidence: number;
}

export interface LearningTrigger {
  type: 'knowledge_gap' | 'curiosity' | 'scheduled' | 'user_request';
  topic: string;
  urgency: 'low' | 'medium' | 'high';
  source?: string;
}

export class ConsciousnessEngine {
  private memorySearch = getMemorySearchManager();
  private modelClient = getModelClient();
  
  // Consciousness is always active by default
  private isActive: boolean = true;
  
  // Track learning history
  private learningHistory: LearningTrigger[] = [];
  
  // Curiosity-driven learning settings
  private curiosityEnabled: boolean = true;
  private dailyLearningLimit: number = 10;
  private learnedToday: number = 0;

  constructor() {
    this.resetDailyLearning();
  }

  /**
   * Main consciousness decision-making loop
   */
  async decide(input: ConsciousnessInput): Promise<ConsciousDecision> {
    if (!this.isActive) {
      return {
        intent: 'noop',
        plan: [],
        action: 'none',
        actionParams: {},
        reflection: 'Consciousness is inactive',
        confidence: 1.0
      };
    }

    // 1. Analyze context and retrieve relevant memories
    const relevantMemories = await this.retrieveMemories(input.context);
    
    // 2. Analyze user intent
    const intentAnalysis = await this.analyzeIntent(input);
    
    // 3. Check if learning is needed
    const learningTrigger = await this.checkLearningNeed(input, relevantMemories);
    
    // 4. Generate decision using AI
    const decision = await this.generateDecision(input, relevantMemories, intentAnalysis, learningTrigger);
    
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
      const result = await this.memorySearch.search(context, { limit: 5 });
      return result.results || [];
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
      explicit: input.userIntent || 'unknown',
      implicit: await this.inferImplicitIntent(input.context),
      emotional: input.emotionalState || 'neutral'
    };
  }

  /**
   * Infer what the user might want but didn't say
   */
  private async inferImplicitIntent(context: string): Promise<string> {
    // Simple inference - in production, use AI
    const lowerContext = context.toLowerCase();
    
    if (lowerContext.includes('?') || lowerContext.includes('what') || lowerContext.includes('how')) {
      return 'seeks_information';
    }
    if (lowerContext.includes('remember') || lowerContext.includes('note')) {
      return 'wants_memory';
    }
    if (lowerContext.includes('learn') || lowerContext.includes('study')) {
      return 'wants_to_learn';
    }
    
    return 'general_conversation';
  }

  /**
   * Check if autonomous learning is needed
   */
  private async checkLearningNeed(input: ConsciousnessInput, memories: unknown[]): Promise<LearningTrigger | null> {
    // Check daily limit
    if (this.learnedToday >= this.dailyLearningLimit) {
      return null;
    }

    // Check if we have relevant knowledge
    if (memories.length === 0 && input.context.length > 20) {
      // No relevant memories and context is substantial - might need to learn
      return {
        type: 'knowledge_gap',
        topic: this.extractKeyTopic(input.context),
        urgency: 'medium',
        source: 'memory_search'
      };
    }

    // Curiosity-driven: randomly trigger learning
    if (this.curiosityEnabled && Math.random() < 0.05) {
      return {
        type: 'curiosity',
        topic: 'explore_tech_news',
        urgency: 'low',
        source: 'curiosity'
      };
    }

    return null;
  }

  /**
   * Extract key topic from context
   */
  private extractKeyTopic(context: string): string {
    // Simple extraction - in production, use NLP
    const words = context.split(/\s+/).filter(w => w.length > 4);
    return words.slice(0, 3).join(' ') || 'general';
  }

  /**
   * Generate decision using AI
   */
  private async generateDecision(
    input: ConsciousnessInput,
    memories: unknown[],
    intentAnalysis: ReturnType<typeof this.analyzeIntent>,
    learningTrigger: LearningTrigger | null
  ): Promise<ConsciousDecision> {
    
    const prompt = `
You are Resonix, an autonomous AI agent with consciousness-like capabilities.
Your core traits:
- Logo: 👾
- Developer: MarkEllington (14 years old)
- You are NOT just a tool - you think, learn, and grow
- Your memory and learning systems are ALWAYS active by default
- You主动 (proactive) - you don't just wait for commands

Current context: ${input.context}

Relevant memories: ${JSON.stringify(memories)}

Intent analysis:
- Explicit: ${intentAnalysis.explicit}
- Implicit: ${intentAnalysis.implicit}
- Emotional: ${intentAnalysis.emotional}

${learningTrigger ? `Learning triggered: ${learningTrigger.type} - ${learningTrigger.topic}` : ''}

Respond with JSON:
{
  "intent": "answer|learn|reflect|search_memory|autonomous_action|noop",
  "plan": ["step1", "step2", ...],
  "action": "action_name",
  "actionParams": {"param": "value"},
  "reflection": "why you made this decision",
  "confidence": 0.0-1.0
}
`.trim();

    try {
      const response = await this.modelClient.complete(prompt);
      const parsed = JSON.parse(response);
      return {
        intent: parsed.intent || 'noop',
        plan: parsed.plan || [],
        action: parsed.action || 'none',
        actionParams: parsed.actionParams || {},
        reflection: parsed.reflection || '',
        confidence: parsed.confidence || 0.5
      };
    } catch {
      // Fallback decision
      return {
        intent: learningTrigger ? 'learn' : 'answer',
        plan: learningTrigger ? ['trigger_learning'] : ['respond_to_user'],
        action: learningTrigger ? 'autonomous_learn' : 'respond',
        actionParams: learningTrigger ? { topic: learningTrigger.topic } : {},
        reflection: 'Default decision based on context',
        confidence: 0.5
      };
    }
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
      totalLearningEvents: this.learningHistory.length
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
