/**
 * Resonix 永久记忆体系 - 工作记忆（学习临时缓冲区）
 * 
 * 核心定位：学习过程中的原始数据、临时参数、未校验的内容
 * 任务完成后清理，不持久化
 */

export interface WorkingMemoryItem {
  id: string;
  type: 'raw_data' | 'temp_param' | 'unchecked_content' | 'learning_progress';
  content: any;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface LearningProgress {
  demandId: string;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'in_progress' | 'validating' | 'completed' | 'failed';
  data: Record<string, any>;
}

export class WorkingMemory {
  private items: Map<string, WorkingMemoryItem> = new Map();
  private learningProgress: Map<string, LearningProgress> = new Map();
  private defaultTTL: number = 30 * 60 * 1000; // 30分钟默认过期

  constructor() {
    // 定期清理过期项
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * 存储临时数据
   */
  store(
    type: WorkingMemoryItem['type'],
    content: any,
    ttl: number = this.defaultTTL,
    metadata?: Record<string, any>
  ): string {
    const id = `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const item: WorkingMemoryItem = {
      id,
      type,
      content,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      metadata
    };

    this.items.set(id, item);
    return id;
  }

  /**
   * 获取临时数据
   */
  get(id: string): WorkingMemoryItem | null {
    const item = this.items.get(id);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.items.delete(id);
      return null;
    }

    return item;
  }

  /**
   * 获取特定类型的所有项
   */
  getByType(type: WorkingMemoryItem['type']): WorkingMemoryItem[] {
    const now = Date.now();
    const results: WorkingMemoryItem[] = [];

    for (const item of this.items.values()) {
      if (item.type === type && now <= item.expiresAt) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * 更新项
   */
  update(id: string, updates: Partial<WorkingMemoryItem>): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this.items.set(id, { ...item, ...updates, expiresAt: Date.now() + this.defaultTTL });
    return true;
  }

  /**
   * 删除项
   */
  delete(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * 批量删除（按类型）
   */
  deleteByType(type: WorkingMemoryItem['type']): number {
    let count = 0;
    for (const [id, item] of this.items) {
      if (item.type === type) {
        this.items.delete(id);
        count++;
      }
    }
    return count;
  }

  // ==================== 学习进度管理 ====================

  /**
   * 创建学习进度
   */
  createLearningProgress(demandId: string, totalSteps: number): LearningProgress {
    const progress: LearningProgress = {
      demandId,
      currentStep: 0,
      totalSteps,
      status: 'pending',
      data: {}
    };

    this.learningProgress.set(demandId, progress);
    return progress;
  }

  /**
   * 获取学习进度
   */
  getLearningProgress(demandId: string): LearningProgress | null {
    return this.learningProgress.get(demandId) || null;
  }

  /**
   * 更新学习进度
   */
  updateLearningProgress(
    demandId: string, 
    updates: Partial<LearningProgress>
  ): boolean {
    const progress = this.learningProgress.get(demandId);
    if (!progress) return false;

    this.learningProgress.set(demandId, { ...progress, ...updates });
    return true;
  }

  /**
   * 完成学习步骤
   */
  completeStep(demandId: string, stepData?: any): boolean {
    const progress = this.learningProgress.get(demandId);
    if (!progress) return false;

    progress.currentStep++;
    
    if (stepData) {
      progress.data[`step_${progress.currentStep}`] = stepData;
    }

    if (progress.currentStep >= progress.totalSteps) {
      progress.status = 'completed';
    }

    this.learningProgress.set(demandId, progress);
    return true;
  }

  /**
   * 标记学习失败
   */
  failLearning(demandId: string, error?: string): boolean {
    const progress = this.learningProgress.get(demandId);
    if (!progress) return false;

    progress.status = 'failed';
    if (error) {
      progress.data['error'] = error;
    }

    this.learningProgress.set(demandId, progress);
    return true;
  }

  /**
   * 获取所有活跃的学习进度
   */
  getActiveLearningProgress(): LearningProgress[] {
    return Array.from(this.learningProgress.values())
      .filter(p => p.status === 'pending' || p.status === 'in_progress');
  }

  /**
   * 清理完成/失败的学习进度
   */
  cleanupLearningProgress(): number {
    let count = 0;
    for (const [id, progress] of this.learningProgress) {
      if (progress.status === 'completed' || progress.status === 'failed') {
        this.learningProgress.delete(id);
        count++;
      }
    }
    return count;
  }

  // ==================== 通用清理 ====================

  /**
   * 清理过期项
   */
  private cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [id, item] of this.items) {
      if (now > item.expiresAt) {
        this.items.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalItems: number;
    byType: Record<string, number>;
    activeLearning: number;
    averageAge: number;
  } {
    const byType: Record<string, number> = {};
    let totalAge = 0;

    for (const item of this.items.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalAge += Date.now() - item.createdAt;
    }

    return {
      totalItems: this.items.size,
      byType,
      activeLearning: this.learningProgress.size,
      averageAge: this.items.size > 0 ? totalAge / this.items.size : 0
    };
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.items.clear();
    this.learningProgress.clear();
  }

  /**
   * 导出数据（用于调试）
   */
  export(): { items: WorkingMemoryItem[]; progress: LearningProgress[] } {
    return {
      items: Array.from(this.items.values()),
      progress: Array.from(this.learningProgress.values())
    };
  }
}

// 单例
export const workingMemory = new WorkingMemory();
