/**
 * Resonix 永久记忆体系 - 语义记忆（结构化知识核心仓库）
 * 
 * 核心定位：标准化知识卡片存储、永久保留、智能迭代
 * 相当于人类的"长期记忆"，存储学会的知识
 */

import path from 'node:path';
import fs from 'node:fs';
import { appDataDir } from '../../config/paths.js';

export interface KnowledgeCard {
  id: string;                      // 唯一标识
  title: string;                   // 知识点标题
  domain: string;                  // 所属领域
  keywords: string[];              // 关键词
  core_content: string;            // 核心内容
  sources: string[];               // 来源
  create_time: number;             // 创建时间
  update_time: number;             // 最后更新时间
  mastery_score: number;          // 掌握度 (0-10)
  timeliness: 'latest' | 'valid' | 'outdated'; // 时效性
  related_knowledge: string[];     // 关联知识ID
  version: number;                 // 版本号
  previous_versions?: number[];   // 历史版本
  metadata?: Record<string, any>; // 额外元数据
}

export interface SemanticMemoryConfig {
  storageDir: string;
  enableVersioning: boolean;
  maxVersions: number;
}

export class SemanticMemory {
  private storageDir: string;
  private enableVersioning: boolean;
  private maxVersions: number;
  private cache: Map<string, KnowledgeCard> = new Map();

  constructor(config?: Partial<SemanticMemoryConfig>) {
    this.storageDir = config?.storageDir || path.join(appDataDir(), 'resonix-memory', 'semantic');
    this.enableVersioning = config?.enableVersioning ?? true;
    this.maxVersions = config?.maxVersions ?? 5;
    
    this.ensureStorageDir();
    this.loadIndex();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 加载索引
   */
  private loadIndex(): void {
    const indexFile = path.join(this.storageDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      try {
        const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        for (const [id, card] of Object.entries(index)) {
          this.cache.set(id, card as KnowledgeCard);
        }
      } catch (e) {
        console.error('[SemanticMemory] Failed to load index:', e);
      }
    }
  }

  /**
   * 保存索引
   */
  private saveIndex(): void {
    const index: Record<string, KnowledgeCard> = {};
    for (const [id, card] of this.cache) {
      index[id] = card;
    }
    const indexFile = path.join(this.storageDir, 'index.json');
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }

  /**
   * 存储知识卡片
   */
  async store(knowledge: Omit<KnowledgeCard, 'create_time' | 'update_time' | 'version'>): Promise<KnowledgeCard> {
    const now = Date.now();
    const existing = this.cache.get(knowledge.id);
    
    const card: KnowledgeCard = {
      ...knowledge,
      create_time: existing?.create_time || now,
      update_time: now,
      version: existing ? existing.version + 1 : 1,
      previous_versions: existing ? [...(existing.previous_versions || []), existing.version] : []
    };

    // 限制历史版本数量
    if (card.previous_versions && card.previous_versions.length > this.maxVersions) {
      card.previous_versions = card.previous_versions.slice(-this.maxVersions);
    }

    this.cache.set(card.id, card);
    this.saveIndex();

    // 保存完整版本历史
    if (this.enableVersioning) {
      const versionFile = path.join(this.storageDir, `${card.id}_v${card.version}.json`);
      fs.writeFileSync(versionFile, JSON.stringify(card, null, 2));
    }

    return card;
  }

  /**
   * 更新知识卡片
   */
  async update(id: string, updates: Partial<KnowledgeCard>): Promise<KnowledgeCard | null> {
    const existing = this.cache.get(id);
    if (!existing) return null;

    // 保存旧版本
    if (this.enableVersioning) {
      const versionFile = path.join(this.storageDir, `${id}_v${existing.version}.json`);
      fs.writeFileSync(versionFile, JSON.stringify(existing, null, 2));
    }

    const updated: KnowledgeCard = {
      ...existing,
      ...updates,
      update_time: Date.now(),
      version: existing.version + 1,
      previous_versions: [...(existing.previous_versions || []), existing.version].slice(-this.maxVersions)
    };

    this.cache.set(id, updated);
    this.saveIndex();

    return updated;
  }

  /**
   * 获取知识卡片
   */
  async get(id: string): Promise<KnowledgeCard | null> {
    return this.cache.get(id) || null;
  }

  /**
   * 获取特定版本
   */
  async getVersion(id: string, version: number): Promise<KnowledgeCard | null> {
    const versionFile = path.join(this.storageDir, `${id}_v${version}.json`);
    if (fs.existsSync(versionFile)) {
      return JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    }
    return null;
  }

  /**
   * 搜索所有知识
   */
  async searchAll(): Promise<KnowledgeCard[]> {
    return Array.from(this.cache.values());
  }

  /**
   * 关键词搜索
   */
  async searchByKeyword(keyword: string): Promise<KnowledgeCard[]> {
    const lower = keyword.toLowerCase();
    return Array.from(this.cache.values()).filter(card => 
      card.keywords?.some(k => k.toLowerCase().includes(lower)) ||
      card.title.toLowerCase().includes(lower) ||
      card.core_content.toLowerCase().includes(lower)
    );
  }

  /**
   * 领域搜索
   */
  async searchByDomain(domain: string): Promise<KnowledgeCard[]> {
    return Array.from(this.cache.values()).filter(card => 
      card.domain === domain
    );
  }

  /**
   * 获取过时知识
   */
  async getOutdated(): Promise<KnowledgeCard[]> {
    return Array.from(this.cache.values()).filter(card => 
      card.timeliness === 'outdated'
    );
  }

  /**
   * 获取低掌握度知识
   */
  async getLowMastery(threshold: number = 6): Promise<KnowledgeCard[]> {
    return Array.from(this.cache.values()).filter(card => 
      (card.mastery_score || 0) < threshold
    );
  }

  /**
   * 获取关联知识
   */
  async getRelated(knowledgeId: string): Promise<KnowledgeCard[]> {
    const card = this.cache.get(knowledgeId);
    if (!card) return [];

    const related: KnowledgeCard[] = [];
    for (const relatedId of card.related_knowledge || []) {
      const relatedCard = this.cache.get(relatedId);
      if (relatedCard) related.push(relatedCard);
    }
    return related;
  }

  /**
   * 添加关联
   */
  async addRelation(knowledgeId: string, relatedId: string): Promise<void> {
    const card = this.cache.get(knowledgeId);
    if (card) {
      if (!card.related_knowledge) card.related_knowledge = [];
      if (!card.related_knowledge.includes(relatedId)) {
        card.related_knowledge.push(relatedId);
        await this.update(knowledgeId, { related_knowledge: card.related_knowledge });
      }
    }
  }

  /**
   * 删除知识卡片
   */
  async delete(id: string): Promise<boolean> {
    if (!this.cache.has(id)) return false;
    
    this.cache.delete(id);
    this.saveIndex();
    
    // 保留版本文件，仅删除索引引用
    return true;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byDomain: Record<string, number>;
    byMastery: Record<string, number>;
    byTimeliness: Record<string, number>;
    averageMastery: number;
  } {
    const cards = Array.from(this.cache.values());
    
    const byDomain: Record<string, number> = {};
    const byMastery: Record<string, number> = { '0-3': 0, '4-6': 0, '7-8': 0, '9-10': 0 };
    const byTimeliness: Record<string, number> = {};
    
    let totalMastery = 0;

    for (const card of cards) {
      byDomain[card.domain] = (byDomain[card.domain] || 0) + 1;
      
      const score = card.mastery_score || 0;
      totalMastery += score;
      if (score <= 3) byMastery['0-3']++;
      else if (score <= 6) byMastery['4-6']++;
      else if (score <= 8) byMastery['7-8']++;
      else byMastery['9-10']++;

      byTimeliness[card.timeliness] = (byTimeliness[card.timeliness] || 0) + 1;
    }

    return {
      total: cards.length,
      byDomain,
      byMastery,
      byTimeliness,
      averageMastery: cards.length > 0 ? totalMastery / cards.length : 0
    };
  }

  /**
   * 智能遗忘：计算保留权重
   */
  calculateRetentionWeight(card: KnowledgeCard): number {
    const masteryWeight = (card.mastery_score || 0) * 0.5;
    const timelinessWeight = card.timeliness === 'latest' ? 0.2 : 
                           card.timeliness === 'valid' ? 0.1 : 0;
    const usageWeight = Math.min(0.3, (card.metadata?.usageCount || 0) * 0.01);
    
    return masteryWeight + timelinessWeight + usageWeight;
  }

  /**
   * 清理低权重知识（智能遗忘）
   */
  async prune(threshold: number = 0.1): Promise<string[]> {
    const pruned: string[] = [];
    
    for (const [id, card] of this.cache) {
      const weight = this.calculateRetentionWeight(card);
      
      // 核心知识不删除
      if (card.mastery_score >= 8 && card.domain !== 'general') continue;
      
      if (weight < threshold) {
        await this.delete(id);
        pruned.push(id);
      }
    }
    
    return pruned;
  }
}
