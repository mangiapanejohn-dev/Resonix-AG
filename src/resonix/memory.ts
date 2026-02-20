/**
 * Resonix Enhanced Memory System
 * 
 * Multi-layer memory system inspired by human memory:
 * - Working Memory (short-term)
 * - Episodic Memory (experiences)
 * - Semantic Memory (knowledge)
 * - Procedural Memory (skills)
 * 
 * This is a CORE DIFFERENTIATOR from OpenClaw - memory is ALWAYS active!
 * 
 * Author: MarkEllington (14-year-old developer)
 * Logo: 👾
 */

import path from "node:path";
import fs from "node:fs";
import { appDataDir } from "../utils.js";

export type MemoryType = 'working' | 'episodic' | 'semantic' | 'procedural';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: Date;
  importance: number; // 0-1
  tags: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface MemorySearchOptions {
  limit?: number;
  type?: MemoryType;
  tags?: string[];
  minImportance?: number;
}

// Memory directories
const MEMORY_BASE = path.join(appDataDir(), 'resonix-memory');

export class EnhancedMemorySystem {
  private memories: Map<string, MemoryEntry> = new Map();
  private workingMemory: MemoryEntry[] = [];
  private maxWorkingMemory: number = 50;

  constructor() {
    this.ensureDirectories();
    this.loadMemories();
  }

  /**
   * Ensure memory directories exist
   */
  private ensureDirectories(): void {
    const dirs = ['working', 'episodic', 'semantic', 'procedural'];
    for (const dir of dirs) {
      const dirPath = path.join(MEMORY_BASE, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  /**
   * Load memories from disk
   */
  private loadMemories(): void {
    const types: MemoryType[] = ['episodic', 'semantic', 'procedural'];
    
    for (const type of types) {
      const dirPath = path.join(MEMORY_BASE, type);
      if (!fs.existsSync(dirPath)) continue;
      
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const entry = JSON.parse(content) as MemoryEntry;
          entry.timestamp = new Date(entry.timestamp);
          this.memories.set(entry.id, entry);
        } catch {
          // Skip corrupted files
        }
      }
    }
  }

  /**
   * Store a memory
   */
  async store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    // Add to working memory if applicable
    if (entry.type === 'working') {
      this.workingMemory.push(fullEntry);
      if (this.workingMemory.length > this.maxWorkingMemory) {
        // Move oldest to episodic
        const old = this.workingMemory.shift();
        if (old) {
          await this.store({ ...old, type: 'episodic' });
        }
      }
    } else {
      // Persist to disk
      await this.persist(fullEntry);
    }

    this.memories.set(fullEntry.id, fullEntry);
    return fullEntry;
  }

  /**
   * Persist memory to disk
   */
  private async persist(entry: MemoryEntry): Promise<void> {
    const dirPath = path.join(MEMORY_BASE, entry.type);
    const filePath = path.join(dirPath, `${entry.id}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  }

  /**
   * Search memories
   */
  async search(query: string, options: MemorySearchOptions = {}): Promise<MemoryEntry[]> {
    const {
      limit = 10,
      type,
      tags,
      minImportance = 0
    } = options;

    let results = Array.from(this.memories.values());

    // Filter by type
    if (type) {
      results = results.filter(m => m.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      results = results.filter(m => 
        tags.some(t => m.tags.includes(t))
      );
    }

    // Filter by importance
    results = results.filter(m => m.importance >= minImportance);

    // Simple text search (in production, use embeddings)
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(m => 
        m.content.toLowerCase().includes(queryLower)
      );
    }

    // Sort by timestamp and importance
    results.sort((a, b) => {
      const scoreA = a.timestamp.getTime() * a.importance;
      const scoreB = b.timestamp.getTime() * b.importance;
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * Get memory by ID
   */
  get(id: string): MemoryEntry | undefined {
    return this.memories.get(id);
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.memories.get(id);
    if (!entry) return false;

    // Remove from working memory
    this.workingMemory = this.workingMemory.filter(m => m.id !== id);

    // Remove from disk
    const filePath = path.join(MEMORY_BASE, entry.type, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.memories.delete(id);
  }

  /**
   * Get working memory (current context)
   */
  getWorkingMemory(): MemoryEntry[] {
    return [...this.workingMemory];
  }

  /**
   * Add to working memory
   */
  async addToWorkingMemory(content: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.store({
      type: 'working',
      content,
      importance: 0.5,
      tags: ['context'],
      metadata
    });
  }

  /**
   * Get episodic memories (experiences)
   */
  async getEpisodicMemories(limit = 10): Promise<MemoryEntry[]> {
    return this.search('', { type: 'episodic', limit });
  }

  /**
   * Get semantic memories (knowledge)
   */
  async getKnowledge(query: string, limit = 5): Promise<MemoryEntry[]> {
    return this.search(query, { type: 'semantic', limit, minImportance: 0.3 });
  }

  /**
   * Store knowledge
   */
  async storeKnowledge(
    content: string,
    importance: number = 0.7,
    tags: string[] = []
  ): Promise<MemoryEntry> {
    return this.store({
      type: 'semantic',
      content,
      importance,
      tags: ['knowledge', ...tags]
    });
  }

  /**
   * Consolidate memories (compress old memories)
   */
  async consolidate(): Promise<number> {
    const oldMemories = Array.from(this.memories.values())
      .filter(m => m.type === 'semantic')
      .filter(m => {
        const age = Date.now() - m.timestamp.getTime();
        return age > 30 * 24 * 60 * 60 * 1000; // 30 days
      });

    let consolidated = 0;
    for (const memory of oldMemories) {
      // In production, use embeddings to find similar memories
      // and consolidate them
      if (memory.importance < 0.3) {
        await this.delete(memory.id);
        consolidated++;
      }
    }

    return consolidated;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const byType: Record<MemoryType, number> = {
      working: 0,
      episodic: 0,
      semantic: 0,
      procedural: 0
    };

    for (const memory of this.memories.values()) {
      byType[memory.type]++;
    }

    return {
      total: this.memories.size,
      working: this.workingMemory.length,
      byType,
      oldestMemory: this.getOldestMemory(),
      newestMemory: this.getNewestMemory()
    };
  }

  private getOldestMemory(): Date | null {
    let oldest: Date | null = null;
    for (const memory of this.memories.values()) {
      if (!oldest || memory.timestamp < oldest) {
        oldest = memory.timestamp;
      }
    }
    return oldest;
  }

  private getNewestMemory(): Date | null {
    let newest: Date | null = null;
    for (const memory of this.memories.values()) {
      if (!newest || memory.timestamp > newest) {
        newest = memory.timestamp;
      }
    }
    return newest;
  }
}

// Singleton
let memorySystem: EnhancedMemorySystem | null = null;

export function getEnhancedMemory(): EnhancedMemorySystem {
  if (!memorySystem) {
    memorySystem = new EnhancedMemorySystem();
  }
  return memorySystem;
}
