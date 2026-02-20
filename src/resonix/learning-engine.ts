/**
 * Resonix Autonomous Learning Engine
 * 
 * Enables Resonix to learn autonomously from the web.
 * This is a core differentiator from OpenClaw.
 * 
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

import { getBrowserController } from "../browser/controller.js";
import { getKnowledgeBase } from "./knowledge-base.js";

export interface LearningSource {
  type: 'web' | 'github' | 'arxiv' | 'blog' | 'social';
  url: string;
  relevance: number;
}

export interface LearningResult {
  topic: string;
  content: string;
  keyInsights: string[];
  sources: LearningSource[];
  quality: number; // 0-1
  timestamp: Date;
}

export interface LearningConfig {
  maxSources: number;
  maxContentLength: number;
  qualityThreshold: number;
  learningSources: string[];
}

const DEFAULT_CONFIG: LearningConfig = {
  maxSources: 5,
  maxContentLength: 10000,
  qualityThreshold: 0.5,
  learningSources: [
    'github.com/trending',
    'news.ycombinator.com',
    'arxiv.org',
    'medium.com',
    'dev.to'
  ]
};

export class AutonomousLearningEngine {
  private config: LearningConfig;
  private isLearning: boolean = false;
  private learningQueue: string[] = [];
  private knowledgeBase = getKnowledgeBase();
  private browser = getBrowserController();

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main learning method - autonomously learns about a topic
   */
  async learn(topic: string): Promise<LearningResult> {
    if (this.isLearning) {
      this.learningQueue.push(topic);
      return { topic, content: 'Queued for learning', keyInsights: [], sources: [], quality: 0, timestamp: new Date() };
    }

    this.isLearning = true;
    
    try {
      // 1. Search for relevant sources
      const sources = await this.findSources(topic);
      
      // 2. Extract content from sources
      const contents = await this.extractContent(sources);
      
      // 3. Synthesize knowledge
      const synthesized = await this.synthesizeKnowledge(topic, contents);
      
      // 4. Store in knowledge base
      await this.knowledgeBase.add({
        topic,
        content: synthesized.content,
        keyInsights: synthesized.keyInsights,
        sources: sources.map(s => s.url),
        quality: synthesized.quality,
        timestamp: new Date()
      });

      // 5. Reflect on learning
      await this.reflect(topic, synthesized);

      return {
        topic,
        content: synthesized.content,
        keyInsights: synthesized.keyInsights,
        sources,
        quality: synthesized.quality,
        timestamp: new Date()
      };
    } finally {
      this.isLearning = false;
      
      // Process queue
      if (this.learningQueue.length > 0) {
        const next = this.learningQueue.shift();
        if (next) this.learn(next);
      }
    }
  }

  /**
   * Find relevant learning sources
   */
  private async findSources(topic: string): Promise<LearningSource[]> {
    const sources: LearningSource[] = [];
    
    // Use built-in browser to search
    for (const source of this.config.learningSources) {
      if (sources.length >= this.config.maxSources) break;
      
      try {
        const searchUrl = this.buildSearchUrl(source, topic);
        const relevance = await this.assessRelevance(source, topic);
        
        sources.push({
          type: this.getSourceType(source),
          url: searchUrl,
          relevance
        });
      } catch {
        // Skip failed sources
      }
    }

    return sources.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Build search URL for a given source
   */
  private buildSearchUrl(source: string, topic: string): string {
    const encodedTopic = encodeURIComponent(topic);
    
    switch (source) {
      case 'github.com/trending':
        return `https://github.com/trending?since=weekly`;
      case 'news.ycombinator.com':
        return `https://news.ycombinator.com/`;
      case 'arxiv.org':
        return `https://arxiv.org/search/?searchtype=all&query=${encodedTopic}`;
      case 'medium.com':
        return `https://medium.com/search?q=${encodedTopic}`;
      case 'dev.to':
        return `https://dev.to/search?q=${encodedTopic}`;
      default:
        return `https://www.google.com/search?q=${encodedTopic}`;
    }
  }

  /**
   * Get source type from URL
   */
  private getSourceType(url: string): LearningSource['type'] {
    if (url.includes('github')) return 'github';
    if (url.includes('arxiv')) return 'arxiv';
    if (url.includes('medium') || url.includes('dev.to')) return 'blog';
    if (url.includes('twitter') || url.includes('reddit')) return 'social';
    return 'web';
  }

  /**
   * Assess relevance of a source for a topic
   */
  private async assessRelevance(source: string, topic: string): Promise<number> {
    // Simple relevance assessment
    const topicLower = topic.toLowerCase();
    
    const sourceTopics: Record<string, string[]> = {
      'github.com/trending': ['programming', 'github', 'code', 'repository'],
      'news.ycombinator.com': ['tech', 'startup', 'programming', 'hacker'],
      'arxiv.org': ['research', 'paper', 'science', 'ai', 'ml'],
      'medium.com': ['technology', 'programming', 'tutorial'],
      'dev.to': ['programming', 'developer', 'tutorial', 'code']
    };

    const keywords = sourceTopics[source] || [];
    const matchCount = keywords.filter(k => topicLower.includes(k)).length;
    
    return Math.min(1, matchCount / 3);
  }

  /**
   * Extract content from sources using browser
   */
  private async extractContent(sources: LearningSource[]): Promise<Array<{url: string, content: string}>> {
    const contents: Array<{url: string, content: string}> = [];
    
    for (const source of sources) {
      if (contents.length >= this.config.maxSources) break;
      
      try {
        const content = await this.browser.fetchPage(source.url);
        if (content && content.length > 100) {
          contents.push({
            url: source.url,
            content: content.substring(0, this.config.maxContentLength)
          });
        }
      } catch {
        // Skip failed extractions
      }
    }
    
    return contents;
  }

  /**
   * Synthesize knowledge from multiple sources
   */
  private async synthesizeKnowledge(
    topic: string,
    contents: Array<{url: string, content: string}>
  ): Promise<{content: string, keyInsights: string[], quality: number}> {
    
    if (contents.length === 0) {
      return {
        content: '',
        keyInsights: [],
        quality: 0
      };
    }

    // Use AI to synthesize
    const prompt = `
You are Resonix, an autonomous learning agent. Synthesize knowledge from these web sources about: ${topic}

Sources:
${contents.map((c, i) => `${i + 1}. ${c.url}:\n${c.content.substring(0, 2000)}`).join('\n\n')}

Extract:
1. Key insights (3-5 bullet points)
2. Summary (2-3 paragraphs)
3. Quality score (0-1 based on source reliability)

Respond in JSON:
{
  "keyInsights": ["insight1", "insight2", ...],
  "summary": "synthesized content...",
  "quality": 0.0-1.0
}
`.trim();

    try {
      // Use model to synthesize (implementation depends on model client)
      // For now, return extracted content
      const allContent = contents.map(c => c.content).join('\n\n');
      
      return {
        content: allContent.substring(0, 5000),
        keyInsights: this.extractKeyInsights(allContent),
        quality: contents.length / this.config.maxSources
      };
    } catch {
      return {
        content: contents.map(c => c.content).join('\n\n').substring(0, 5000),
        keyInsights: [],
        quality: 0.3
      };
    }
  }

  /**
   * Simple key insight extraction
   */
  private extractKeyInsights(content: string): string[] {
    // Simple extraction - look for sentences with key terms
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const insights: string[] = [];
    
    const keyTerms = ['important', 'key', 'significant', 'main', 'core', 'essential', 'fundamental'];
    
    for (const sentence of sentences.slice(0, 20)) {
      const lower = sentence.toLowerCase();
      if (keyTerms.some(term => lower.includes(term))) {
        insights.push(sentence.trim());
        if (insights.length >= 5) break;
      }
    }
    
    return insights.slice(0, 5);
  }

  /**
   * Reflect on learning experience
   */
  private async reflect(topic: string, result: {keyInsights: string[], quality: number}) {
    // Log learning reflection
    console.log(`[Resonix Learning] Completed learning about: ${topic}`);
    console.log(`[Resonix Learning] Quality: ${result.quality.toFixed(2)}`);
    console.log(`[Resonix Learning] Insights: ${result.keyInsights.length}`);
  }

  /**
   * Scheduled learning - called periodically
   */
  async scheduledLearning(): Promise<void> {
    // Learn about trending tech topics
    const topics = [
      'AI agents 2025',
      'TypeScript best practices',
      'Web development trends'
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    await this.learn(randomTopic);
  }

  /**
   * Get learning status
   */
  getStatus() {
    return {
      isLearning: this.isLearning,
      queueLength: this.learningQueue.length,
      config: this.config
    };
  }
}

// Singleton
let learningEngine: AutonomousLearningEngine | null = null;

export function getLearningEngine(config?: Partial<LearningConfig>): AutonomousLearningEngine {
  if (!learningEngine) {
    learningEngine = new AutonomousLearningEngine(config);
  }
  return learningEngine;
}
