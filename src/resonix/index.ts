/**
 * Resonix 认知引擎 - 统一入口
 * 
 * 整合：自主认知 + 自主学习 + 永久记忆
 * 实现：认知 → 学习 → 记忆 → 认知迭代 的闭环
 */

import { SemanticMemory } from './memory/semantic-memory.js';
import { ProgramMemory } from './memory/program-memory.js';
import { EpisodicMemory } from './memory/episodic-memory.js';
import { WorkingMemory } from './memory/working-memory.js';

import { SelfPerception } from './cognition/self-perception.js';
import { DemandRecognition } from './cognition/demand-recognition.js';
import { DeviationCorrection } from './cognition/deviation-correction.js';

import { PathPlanner } from './learning/path-planner.js';

export interface ResonixConfig {
  enableAutonomousLearning: boolean;
  learningIntervalMs: number;
  profileUpdateIntervalMs: number;
  memoryPruneIntervalMs: number;
}

export class ResonixCognitionEngine {
  // 记忆系统
  public semanticMemory: SemanticMemory;
  public programMemory: ProgramMemory;
  public episodicMemory: EpisodicMemory;
  public workingMemory: WorkingMemory;

  // 认知系统
  public selfPerception: SelfPerception;
  public demandRecognition: DemandRecognition;
  public deviationCorrection: DeviationCorrection;

  // 学习系统
  public pathPlanner: PathPlanner;

  // 配置
  private config: ResonixConfig;
  private running: boolean = false;
  private intervals: NodeJS.Timeout[] = [];

  constructor(config?: Partial<ResonixConfig>) {
    this.config = {
      enableAutonomousLearning: config?.enableAutonomousLearning ?? true,
      learningIntervalMs: config?.learningIntervalMs ?? 30 * 60 * 1000, // 30分钟
      profileUpdateIntervalMs: config?.profileUpdateIntervalMs ?? 60 * 60 * 1000, // 1小时
      memoryPruneIntervalMs: config?.memoryPruneIntervalMs ?? 24 * 60 * 60 * 1000 // 1天
    };

    // 初始化记忆系统
    this.semanticMemory = new SemanticMemory();
    this.programMemory = new ProgramMemory();
    this.episodicMemory = new EpisodicMemory();
    this.workingMemory = new WorkingMemory();

    // 初始化认知系统
    this.selfPerception = new SelfPerception(this.semanticMemory, this.programMemory);
    this.demandRecognition = new DemandRecognition(this.selfPerception, this.episodicMemory);
    this.deviationCorrection = new DeviationCorrection(
      this.semanticMemory, 
      this.episodicMemory, 
      this.programMemory
    );

    // 初始化学习系统
    this.pathPlanner = new PathPlanner(this.programMemory, this.semanticMemory);
  }

  /**
   * 启动认知引擎
   */
  async start(): Promise<void> {
    if (this.running) return;
    
    console.log('[Resonix] 启动认知引擎...');

    // 1. 初始化能力画像
    await this.selfPerception.generateCapabilityProfile();

    // 2. 生成初始学习需求
    await this.demandRecognition.generateDemandList();

    // 3. 启动定期任务
    this.startPeriodicTasks();

    this.running = true;
    console.log('[Resonix] 认知引擎已启动');
  }

  /**
   * 停止认知引擎
   */
  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    this.running = false;
    console.log('[Resonix] 认知引擎已停止');
  }

  /**
   * 启动定期任务
   */
  private startPeriodicTasks(): void {
    // 定期更新能力画像
    const profileInterval = setInterval(async () => {
      console.log('[Resonix] 更新能力画像...');
      await this.selfPerception.generateCapabilityProfile();
      await this.episodicMemory.log({
        event_type: 'system_event',
        content: '能力画像已更新'
      });
    }, this.config.profileUpdateIntervalMs);
    this.intervals.push(profileInterval);

    // 定期生成学习需求
    if (this.config.enableAutonomousLearning) {
      const learningInterval = setInterval(async () => {
        console.log('[Resonix] 检查学习需求...');
        await this.performAutonomousLearning();
      }, this.config.learningIntervalMs);
      this.intervals.push(learningInterval);
    }

    // 定期清理记忆
    const pruneInterval = setInterval(async () => {
      console.log('[Resonix] 清理过期记忆...');
      const pruned = await this.semanticMemory.prune();
      await this.episodicMemory.cleanup();
      console.log(`[Resonix] 已清理 ${pruned.length} 个低权重知识`);
    }, this.config.memoryPruneIntervalMs);
    this.intervals.push(pruneInterval);

    // 定期迭代策略
    const iterateInterval = setInterval(async () => {
      console.log('[Resonix] 迭代学习策略...');
      const result = await this.programMemory.iterateStrategies();
      console.log(`[Resonix] 策略迭代: 提升${result.promoted.length}, 降级${result.demoted.length}, 删除${result.removed.length}`);
    }, 7 * 24 * 60 * 60 * 1000); // 每周
    this.intervals.push(iterateInterval);
  }

  /**
   * 执行自主学习
   */
  async performAutonomousLearning(): Promise<void> {
    try {
      // 1. 生成学习需求
      const demands = await this.demandRecognition.getHighPriorityDemands(60);
      
      if (demands.length === 0) {
        console.log('[Resonix] 无待处理的学习需求');
        return;
      }

      console.log(`[Resonix] 开始处理 ${demands.length} 个学习需求`);

      // 2. 为每个高优先级需求生成学习路径
      for (const demand of demands.slice(0, 3)) { // 最多同时处理3个
        // 创建学习进度
        const progress = this.workingMemory.createLearningProgress(demand.id, 1);
        
        // 生成学习路径
        const path = await this.pathPlanner.generatePath(demand);
        
        // 执行学习路径
        const result = await this.pathPlanner.executePath(path);
        
        if (result.success) {
          // 更新能力画像
          await this.selfPerception.updateMastery(result.knowledgeId!, 2);
          
          // 标记需求已处理
          await this.demandRecognition.markDemandProcessed(demand.id);
          
          console.log(`[Resonix] 学习完成: ${demand.topic}`);
        } else {
          console.error(`[Resonix] 学习失败: ${demand.topic}`, result.error);
        }

        // 清理学习进度
        this.workingMemory.cleanupLearningProgress();
      }

    } catch (error: any) {
      console.error('[Resonix] 自主学习出错:', error);
      
      // 记录错误
      await this.episodicMemory.log({
        event_type: 'error',
        content: `自主学习出错: ${error.message}`,
        metadata: { error: error.stack }
      });
    }
  }

  /**
   * 处理用户反馈
   */
  async processUserFeedback(feedback: string, relatedKnowledgeId?: string): Promise<void> {
    // 1. 记录反馈
    await this.episodicMemory.log({
      event_type: 'user_feedback',
      content: feedback,
      relatedKnowledge: relatedKnowledgeId ? [relatedKnowledgeId] : undefined,
      sentiment: /错误|不对|差/i.test(feedback) ? 'negative' : 
                 /好|棒|赞/i.test(feedback) ? 'positive' : 'neutral'
    });

    // 2. 检测偏差
    const deviation = await this.deviationCorrection.detectFromUserFeedback(feedback, relatedKnowledgeId);
    
    if (deviation) {
      // 触发修正学习
      await this.deviationCorrection.triggerCorrectionLearning(deviation.id);
      
      // 立即执行一次学习
      if (this.config.enableAutonomousLearning) {
        await this.performAutonomousLearning();
      }
    }

    // 3. 更新知识掌握度
    if (relatedKnowledgeId) {
      const delta = /错误|不对/i.test(feedback) ? -1 : 
                   /好|棒/i.test(feedback) ? 1 : 0;
      if (delta !== 0) {
        await this.selfPerception.updateMastery(relatedKnowledgeId, delta);
      }
    }
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    running: boolean;
    memory: {
      semantic: ReturnType<SemanticMemory['getStats']>;
      program: number;
      episodic: ReturnType<EpisodicMemory['getStats']>;
      working: ReturnType<WorkingMemory['getStats']>;
    };
    cognition: {
      profile: any;
      demands: number;
      deviations: number;
    };
  } {
    return {
      running: this.running,
      memory: {
        semantic: this.semanticMemory.getStats(),
        program: 0, // 简化
        episodic: this.episodicMemory.getStats(),
        working: this.workingMemory.getStats()
      },
      cognition: {
        profile: this.selfPerception.getProfile(),
        demands: this.demandRecognition.getCurrentDemands()?.demands.length || 0,
        deviations: this.deviationCorrection.getActiveDeviations().length
      }
    };
  }
}

// 单例
let cognitionEngineInstance: ResonixCognitionEngine | null = null;

export function getCognitionEngine(config?: Partial<ResonixConfig>): ResonixCognitionEngine {
  if (!cognitionEngineInstance) {
    cognitionEngineInstance = new ResonixCognitionEngine(config);
  }
  return cognitionEngineInstance;
}

export { SemanticMemory, ProgramMemory, EpisodicMemory, WorkingMemory };
export { SelfPerception, DemandRecognition, DeviationCorrection };
export { PathPlanner };
