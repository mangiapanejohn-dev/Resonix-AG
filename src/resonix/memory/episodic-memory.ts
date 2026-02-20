/**
 * Resonix 永久记忆体系 - 情景记忆（学习/交互行为日志库）
 * 
 * 核心定位：存储自主认知结论、学习执行记录、用户反馈、异常信息
 * 相当于人类的"情景记忆"，为偏差修正和学习策略优化提供依据
 */

import path from 'node:path';
import fs from 'node:fs';
import { appDataDir } from '../../config/paths.js';

export interface EpisodicEvent {
  id: string;
  event_type: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
  relatedKnowledge?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface EpisodicSearchQuery {
  event_type?: string;
  content?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface EpisodicMemoryConfig {
  storageDir: string;
  retentionDays: number;
  maxEventsPerDay: number;
}

export class EpisodicMemory {
  private storageDir: string;
  private retentionDays: number;
  private maxEventsPerDay: number;
  private memoryCache: EpisodicEvent[] = [];
  private initialized: boolean = false;

  constructor(config?: Partial<EpisodicMemoryConfig>) {
    this.storageDir = config?.storageDir || path.join(appDataDir(), 'resonix-memory', 'episodic');
    this.retentionDays = config?.retentionDays ?? 365;
    this.maxEventsPerDay = config?.maxEventsPerDay ?? 1000;
    
    this.ensureStorageDir();
    this.loadRecentEvents();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 加载最近的事件
   */
  private async loadRecentEvents(): Promise<void> {
    const daysToLoad = 7; // 加载最近7天
    const now = Date.now();
    
    for (let i = 0; i < daysToLoad; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = this.formatDate(date);
      const events = await this.loadDayEvents(dateStr);
      this.memoryCache.push(...events);
    }
    
    this.initialized = true;
  }

  /**
   * 记录事件
   */
  async log(event: Omit<EpisodicEvent, 'id' | 'timestamp'>): Promise<EpisodicEvent> {
    const fullEvent: EpisodicEvent = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    // 添加到缓存
    this.memoryCache.push(fullEvent);

    // 保存到当日文件
    const dateStr = this.formatDate(new Date());
    await this.appendToDayFile(dateStr, fullEvent);

    // 定期清理旧事件
    if (this.memoryCache.length > this.maxEventsPerDay * 30) {
      await this.cleanup();
    }

    return fullEvent;
  }

  /**
   * 搜索事件
   */
  async search(query: EpisodicSearchQuery): Promise<EpisodicEvent[]> {
    let results = this.memoryCache;

    if (query.event_type) {
      results = results.filter(e => e.event_type === query.event_type);
    }

    if (query.content) {
      const lowerContent = query.content.toLowerCase();
      results = results.filter(e => e.content.toLowerCase().includes(lowerContent));
    }

    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }

    // 按时间倒序
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * 获取最近的事件
   */
  async getRecent(limit: number = 100): Promise<EpisodicEvent[]> {
    return this.memoryCache
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取特定类型的事件统计
   */
  async getEventStats(eventType?: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    const filtered = eventType 
      ? this.memoryCache.filter(e => e.event_type === eventType)
      : this.memoryCache;

    for (const event of filtered) {
      stats[event.event_type] = (stats[event.event_type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取用户反馈事件
   */
  async getUserFeedback(): Promise<EpisodicEvent[]> {
    return this.search({ 
      event_type: 'user_feedback',
      limit: 100 
    });
  }

  /**
   * 获取错误事件
   */
  async getErrors(): Promise<EpisodicEvent[]> {
    return this.search({
      content: 'error',
      limit: 50
    });
  }

  /**
   * 获取特定知识相关的事件
   */
  async getRelatedToKnowledge(knowledgeId: string): Promise<EpisodicEvent[]> {
    return this.memoryCache
      .filter(e => e.relatedKnowledge?.includes(knowledgeId))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清理过期事件
   */
  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    const beforeCount = this.memoryCache.length;
    
    // 保留超过保留期的事件到归档
    const toArchive = this.memoryCache.filter(e => e.timestamp < cutoff);
    for (const event of toArchive) {
      const dateStr = this.formatDate(new Date(event.timestamp));
      await this.archiveEvent(dateStr, event);
    }

    // 从内存中移除
    this.memoryCache = this.memoryCache.filter(e => e.timestamp >= cutoff);
    
    // 删除旧的日记文件
    await this.deleteOldDayFiles(cutoff);

    return beforeCount - this.memoryCache.length;
  }

  /**
   * 归档事件
   */
  private async archiveEvent(originalDate: string, event: EpisodicEvent): Promise<void> {
    const archiveDir = path.join(this.storageDir, 'archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archiveFile = path.join(archiveDir, `${originalDate}.jsonl`);
    const line = JSON.stringify(event) + '\n';
    
    fs.appendFileSync(archiveFile, line);
  }

  /**
   * 获取每日事件文件路径
   */
  private getDayFilePath(dateStr: string): string {
    return path.join(this.storageDir, `${dateStr}.jsonl`);
  }

  /**
   * 加载单日事件
   */
  private async loadDayEvents(dateStr: string): Promise<EpisodicEvent[]> {
    const filePath = this.getDayFilePath(dateStr);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      return lines.map(line => JSON.parse(line) as EpisodicEvent);
    } catch (e) {
      console.error(`[EpisodicMemory] Failed to load day events for ${dateStr}:`, e);
      return [];
    }
  }

  /**
   * 追加到当日文件
   */
  private async appendToDayFile(dateStr: string, event: EpisodicEvent): Promise<void> {
    const filePath = this.getDayFilePath(dateStr);
    const line = JSON.stringify(event) + '\n';
    
    fs.appendFileSync(filePath, line);
  }

  /**
   * 删除旧的日记文件
   */
  private async deleteOldDayFiles(cutoff: number): Promise<void> {
    const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.jsonl'));
    
    for (const file of files) {
      const dateStr = file.replace('.jsonl', '');
      const date = this.parseDate(dateStr);
      
      if (date.getTime() < cutoff) {
        const archiveDir = path.join(this.storageDir, 'archive');
        const archivePath = path.join(archiveDir, file);
        
        // 如果归档文件不存在，复制过去
        if (!fs.existsSync(archivePath)) {
          const sourcePath = path.join(this.storageDir, file);
          if (fs.existsSync(sourcePath)) {
            if (!fs.existsSync(archiveDir)) {
              fs.mkdirSync(archiveDir, { recursive: true });
            }
            fs.copyFileSync(sourcePath, archivePath);
          }
        }
        
        // 删除原文件
        fs.unlinkSync(path.join(this.storageDir, file));
      }
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 解析日期
   */
  private parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00Z');
  }

  /**
   * 获取记忆统计
   */
  getStats(): {
    totalEvents: number;
    byType: Record<string, number>;
    dateRange: { start: number; end: number };
    averagePerDay: number;
  } {
    const byType: Record<string, number> = {};
    let minTime = Date.now();
    let maxTime = 0;

    for (const event of this.memoryCache) {
      byType[event.event_type] = (byType[event.event_type] || 0) + 1;
      minTime = Math.min(minTime, event.timestamp);
      maxTime = Math.max(maxTime, event.timestamp);
    }

    const days = Math.max(1, (maxTime - minTime) / (24 * 60 * 60 * 1000));

    return {
      totalEvents: this.memoryCache.length,
      byType,
      dateRange: { start: minTime, end: maxTime },
      averagePerDay: this.memoryCache.length / days
    };
  }
}
