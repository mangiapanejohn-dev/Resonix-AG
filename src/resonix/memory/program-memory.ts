/**
 * Resonix 永久记忆体系 - 程序记忆（学习策略/技能沉淀库）
 * 
 * 核心定位：存储API调用策略、浏览器操作模板、反爬规则等
 * 相当于人类的"技能记忆"，越用越聪明
 */

import path from 'node:path';
import fs from 'node:fs';
import { appDataDir } from '../../config/paths.js';

export interface LearningStrategy {
  id: string;
  name: string;
  type: 'api' | 'browser' | 'extraction' | 'evaluation';
  content: Record<string, any>;
  successRate: number;
  usageCount: number;
  lastUsed: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isOptimal: boolean;
}

export interface BrowserTemplate {
  id: string;
  siteName: string;
  urlPatterns: string[];
  actions: BrowserAction[];
  antiCrawlConfig: AntiCrawlConfig;
  extractionRules: ExtractionRule[];
  successRate: number;
}

export interface BrowserAction {
  type: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'extract';
  selector?: string;
  text?: string;
  options?: Record<string, any>;
}

export interface AntiCrawlConfig {
  useProxy: boolean;
  proxyPoolSize: number;
  fingerprintPoolSize: number;
  humanBehavior: boolean;
  autoSolveCaptcha: boolean;
}

export interface ExtractionRule {
  type: 'css' | 'xpath' | 'regex' | 'ai';
  pattern: string;
  field: string;
  transform?: string;
}

export interface ProgramMemoryConfig {
  storageDir: string;
}

export class ProgramMemory {
  private storageDir: string;
  private strategies: Map<string, LearningStrategy> = new Map();
  private browserTemplates: Map<string, BrowserTemplate> = new Map();

  constructor(config?: Partial<ProgramMemoryConfig>) {
    this.storageDir = config?.storageDir || path.join(appDataDir(), 'resonix-memory', 'program');
    this.ensureStorageDir();
    this.loadStrategies();
    this.loadBrowserTemplates();
  }

  private ensureStorageDir(): void {
    const dirs = ['', 'strategies', 'browser-templates'];
    for (const dir of dirs) {
      const fullPath = path.join(this.storageDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * 加载策略
   */
  private loadStrategies(): void {
    const strategiesDir = path.join(this.storageDir, 'strategies');
    const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const strategy = JSON.parse(fs.readFileSync(path.join(strategiesDir, file), 'utf-8'));
        this.strategies.set(strategy.id, strategy);
      } catch (e) {
        console.error(`[ProgramMemory] Failed to load strategy ${file}:`, e);
      }
    }
  }

  /**
   * 加载浏览器模板
   */
  private loadBrowserTemplates(): void {
    const templatesDir = path.join(this.storageDir, 'browser-templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const template = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf-8'));
        this.browserTemplates.set(template.id, template);
      } catch (e) {
        console.error(`[ProgramMemory] Failed to load template ${file}:`, e);
      }
    }
  }

  /**
   * 存储学习策略
   */
  async storeStrategy(name: string, content: Record<string, any>): Promise<LearningStrategy> {
    const existing = Array.from(this.strategies.values()).find(s => s.name === name);
    
    const strategy: LearningStrategy = {
      id: existing?.id || `strategy_${Date.now()}`,
      name,
      type: this.inferStrategyType(content),
      content,
      successRate: existing?.successRate || 0.5,
      usageCount: existing?.usageCount || 0,
      lastUsed: existing?.lastUsed || Date.now(),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      tags: this.extractTags(content),
      isOptimal: false
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategy(strategy);

    return strategy;
  }

  /**
   * 获取策略
   */
  async getStrategy(name: string): Promise<LearningStrategy | null> {
    return Array.from(this.strategies.values()).find(s => s.name === name) || null;
  }

  /**
   * 获取所有策略
   */
  async getAllStrategies(): Promise<LearningStrategy[]> {
    return Array.from(this.strategies.values());
  }

  /**
   * 更新策略使用效果
   */
  async updateStrategyEffect(name: string, success: boolean): Promise<void> {
    const strategy = Array.from(this.strategies.values()).find(s => s.name === name);
    if (!strategy) return;

    const newUsageCount = strategy.usageCount + 1;
    const successDelta = success ? 1 : 0;
    
    // 加权平均计算成功率
    const newSuccessRate = (
      (strategy.successRate * strategy.usageCount) + successDelta
    ) / newUsageCount;

    strategy.successRate = newSuccessRate;
    strategy.usageCount = newUsageCount;
    strategy.lastUsed = Date.now();
    strategy.updatedAt = Date.now();

    this.strategies.set(strategy.id, strategy);
    this.saveStrategy(strategy);
  }

  /**
   * 标记为最优策略
   */
  async markOptimal(name: string): Promise<void> {
    const strategy = Array.from(this.strategies.values()).find(s => s.name === name);
    if (!strategy) return;

    // 取消其他同类型策略的最优标记
    for (const [id, s] of this.strategies) {
      if (s.type === strategy.type && s.isOptimal) {
        s.isOptimal = false;
        this.saveStrategy(s);
      }
    }

    strategy.isOptimal = true;
    this.strategies.set(strategy.id, strategy);
    this.saveStrategy(strategy);
  }

  /**
   * 获取最优策略
   */
  async getOptimalStrategy(type?: string): Promise<LearningStrategy | null> {
    let candidates = Array.from(this.strategies.values());
    
    if (type) {
      candidates = candidates.filter(s => s.type === type);
    }

    // 按成功率和使用次数排序
    candidates.sort((a, b) => {
      if (a.isOptimal !== b.isOptimal) return b.isOptimal ? 1 : -1;
      if (a.successRate !== b.successRate) return b.successRate - a.successRate;
      return b.usageCount - a.usageCount;
    });

    return candidates[0] || null;
  }

  /**
   * 存储浏览器模板
   */
  async storeBrowserTemplate(template: BrowserTemplate): Promise<void> {
    this.browserTemplates.set(template.id, template);
    
    const templateFile = path.join(this.storageDir, 'browser-templates', `${template.id}.json`);
    fs.writeFileSync(templateFile, JSON.stringify(template, null, 2));
  }

  /**
   * 获取浏览器模板
   */
  async getBrowserTemplate(siteName: string): Promise<BrowserTemplate | null> {
    return Array.from(this.browserTemplates.values()).find(t => 
      t.siteName === siteName
    ) || null;
  }

  /**
   * 获取匹配的浏览器模板
   */
  async getMatchingTemplate(url: string): Promise<BrowserTemplate | null> {
    for (const template of this.browserTemplates.values()) {
      if (template.urlPatterns.some(pattern => this.matchUrl(url, pattern))) {
        return template;
    return null;
      }
    }
  }

  /**
   * 获取所有浏览器模板
   */
  async getAllBrowserTemplates(): Promise<BrowserTemplate[]> {
    return Array.from(this.browserTemplates.values());
  }

  /**
   * 迭代策略（每周执行）
   */
  async iterateStrategies(): Promise<{
    promoted: string[];
    demoted: string[];
    removed: string[];
  }> {
    const promoted: string[] = [];
    const demoted: string[] = [];
    const removed: string[] = [];

    // 按类型分组
    const byType = new Map<string, LearningStrategy[]>();
    for (const strategy of this.strategies.values()) {
      const list = byType.get(strategy.type) || [];
      list.push(strategy);
      byType.set(strategy.type, list);
    }

    // 对每种类型进行迭代
    for (const [type, strategies] of byType) {
      if (strategies.length === 0) continue;

      // 按成功率排序
      strategies.sort((a, b) => b.successRate - a.successRate);

      // 前20%标记为最优
      const optimalCount = Math.max(1, Math.ceil(strategies.length * 0.2));
      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        const shouldBeOptimal = i < optimalCount && strategy.successRate > 0.3;
        
        if (shouldBeOptimal && !strategy.isOptimal) {
          strategy.isOptimal = true;
          promoted.push(strategy.name);
          this.saveStrategy(strategy);
        } else if (!shouldBeOptimal && strategy.isOptimal) {
          strategy.isOptimal = false;
          demoted.push(strategy.name);
          this.saveStrategy(strategy);
        }

        // 成功率太低的删除
        if (strategy.successRate < 0.1 && strategy.usageCount > 10) {
          this.strategies.delete(strategy.id);
          removed.push(strategy.name);
          const filePath = path.join(this.storageDir, 'strategies', `${strategy.id}.json`);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
    }

    return { promoted, demoted, removed };
  }

  /**
   * 保存策略到文件
   */
  private saveStrategy(strategy: LearningStrategy): void {
    const filePath = path.join(this.storageDir, 'strategies', `${strategy.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));
  }

  /**
   * 推断策略类型
   */
  private inferStrategyType(content: Record<string, any>): LearningStrategy['type'] {
    if (content.apiParams || content.endpoint) return 'api';
    if (content.actions || content.urlPatterns) return 'browser';
    if (content.extractionRule || content.pattern) return 'extraction';
    return 'evaluation';
  }

  /**
   * 提取标签
   */
  private extractTags(content: Record<string, any>): string[] {
    const tags = new Set<string>();
    
    // 从内容中提取关键词作为标签
    const extractFrom = JSON.stringify(content).toLowerCase();
    const techTerms = extractFrom.match(/[a-z]+(?:\d+\.\d+)?/g) || [];
    tags.add(...techTerms.slice(0, 5));
    
    return Array.from(tags);
  }

  /**
   * URL匹配
   */
  private matchUrl(url: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(url);
    }
    return url.includes(pattern);
  }
}
