/**
 * Resonix Knowledge Base
 * 
 * Structured knowledge storage with semantic search.
 * Part of Resonix's autonomous learning system.
 * 
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

import path from "node:path";
import fs from "node:fs";
import { appDataDir } from "../utils.js";

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  keyInsights: string[];
  sources: string[];
  quality: number;
  timestamp: Date;
  tags: string[];
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  relevance: number;
}

const KNOWLEDGE_BASE_DIR = path.join(appDataDir(), 'resonix-knowledge');

export class KnowledgeBase {
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  private topicIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.ensureDirectory();
    this.loadKnowledge();
  }

  /**
   * Ensure knowledge directory exists
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
      fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
    }
  }

  /**
   * Load knowledge from disk
   */
  private loadKnowledge(): void {
    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) return;

    const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(KNOWLEDGE_BASE_DIR, file), 'utf-8');
        const entry = JSON.parse(content) as KnowledgeEntry;
        entry.timestamp = new Date(entry.timestamp);
        
        this.knowledge.set(entry.id, entry);
        this.indexEntry(entry);
      } catch {
        // Skip corrupted files
      }
    }
  }

  /**
   * Index an entry for search
   */
  private indexEntry(entry: KnowledgeEntry): void {
    // Topic index
    const topicWords = entry.topic.toLowerCase().split(/\s+/);
    for (const word of topicWords) {
      if (word.length > 2) {
        if (!this.topicIndex.has(word)) {
          this.topicIndex.set(word, new Set());
        }
        this.topicIndex.get(word)!.add(entry.id);
      }
    }

    // Tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    }
  }

  /**
   * Add knowledge
   */
  async add(data: Omit<KnowledgeEntry, 'id' | 'timestamp'>): Promise<KnowledgeEntry> {
    const entry: KnowledgeEntry = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Save to disk
    const filePath = path.join(KNOWLEDGE_BASE_DIR, `${entry.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));

    // Add to memory
    this.knowledge.set(entry.id, entry);
    this.indexEntry(entry);

    return entry;
  }

  /**
   * Search knowledge
   */
  search(query: string, limit = 5): KnowledgeSearchResult[] {
    if (!query) {
      // Return recent if no query
      return Array.from(this.knowledge.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
        .map(entry => ({ entry, relevance: 1 }));
    }

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const results: Array<{entry: KnowledgeEntry, relevance: number}> = [];

    // Find candidate entries
    const candidateIds = new Set<string>();
    for (const word of queryWords) {
      const topicMatches = this.topicIndex.get(word);
      if (topicMatches) {
        for (const id of topicMatches) {
          candidateIds.add(id);
        }
      }
    }

    // Calculate relevance
    for (const id of candidateIds) {
      const entry = this.knowledge.get(id);
      if (!entry) continue;

      let relevance = 0;

      // Topic match
      for (const word of queryWords) {
        if (entry.topic.toLowerCase().includes(word)) {
          relevance += 0.5;
        }
      }

      // Content match
      for (const word of queryWords) {
        if (entry.content.toLowerCase().includes(word)) {
          relevance += 0.3;
        }
      }

      // Tag match
      for (const word of queryWords) {
        if (entry.tags.some(t => t.toLowerCase().includes(word))) {
          relevance += 0.2;
        }
      }

      // Quality boost
      relevance *= entry.quality;

      if (relevance > 0) {
        results.push({ entry, relevance });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, limit);
  }

  /**
   * Get knowledge by ID
   */
  get(id: string): KnowledgeEntry | undefined {
    return this.knowledge.get(id);
  }

  /**
   * Get knowledge by topic
   */
  getByTopic(topic: string): KnowledgeEntry[] {
    const results = this.search(topic, 10);
    return results.map(r => r.entry);
  }

  /**
   * Get recent knowledge
   */
  getRecent(limit = 10): KnowledgeEntry[] {
    return Array.from(this.knowledge.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Delete knowledge
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.knowledge.get(id);
    if (!entry) return false;

    const filePath = path.join(KNOWLEDGE_BASE_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.knowledge.delete(id);
  }

  /**
   * Get statistics
   */
  getStats() {
    const qualities = Array.from(this.knowledge.values()).map(e => e.quality);
    const avgQuality = qualities.length > 0 
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length 
      : 0;

    return {
      totalEntries: this.knowledge.size,
      avgQuality,
      topics: this.topicIndex.size,
      tags: this.tagIndex.size,
      newestEntry: this.getNewest(),
      oldestEntry: this.getOldest()
    };
  }

  private getNewest(): Date | null {
    let newest: Date | null = null;
    for (const entry of this.knowledge.values()) {
      if (!newest || entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }
    return newest;
  }

  private getOldest(): Date | null {
    let oldest: Date | null = null;
    for (const entry of this.knowledge.values()) {
      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    }
    return oldest;
  }
}

// Singleton
let knowledgeBase: KnowledgeBase | null = null;

export function getKnowledgeBase(): KnowledgeBase {
  if (!knowledgeBase) {
    knowledgeBase = new KnowledgeBase();
  }
  return knowledgeBase;
}
