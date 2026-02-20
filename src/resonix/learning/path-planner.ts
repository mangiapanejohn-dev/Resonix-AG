/**
 * Resonix 自主学习体系 - 学习路径规划器
 * 
 * 核心能力：基于自主认知结论的「学习目标清单」，自动生成动态学习路径树
 * 支持：BrewAPI优先、内置浏览器兜底
 */

import { LearningDemand } from '../cognition/demand-recognition.js';
import { ProgramMemory } from '../memory/program-memory.js';
import { SemanticMemory } from '../memory/semantic-memory.js';

export interface LearningPath {
  id: string;
  demandId: string;
  topic: string;
  targetMastery: number;
  steps: LearningStep[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface LearningStep {
  id: string;
  type: 'brewapi_basic' | 'brewapi_advanced' | 'browser_documentation' | 'browser_practical' | 'validation';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  params: Record<string, any>;
  result?: any;
  error?: string;
}

export interface PathExecutionResult {
  pathId: string;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  knowledgeId?: string;
  error?: string;
}

export class PathPlanner {
  private programMemory: ProgramMemory;
  private semanticMemory: SemanticMemory;

  constructor(programMemory: ProgramMemory, semanticMemory: SemanticMemory) {
    this.programMemory = programMemory;
    this.semanticMemory = semanticMemory;
  }

  /**
   * 基于学习需求生成学习路径
   */
  async generatePath(demand: LearningDemand): Promise<LearningPath> {
    const steps: LearningStep[] = [];

    // 1. 基础阶段：BrewAPI查询核心原理（高优先级）
    if (demand.depth === 'basic' || demand.depth === 'advanced') {
      steps.push({
        id: `step_${demand.id}_basic`,
        type: 'brewapi_basic',
        priority: 'high',
        status: 'pending',
        params: {
          query: demand.topic,
          search_type: 'tech',
          depth: 1,
          targetMastery: demand.targetMastery * 0.3
        }
      });
    }

    // 2. 进阶阶段：内置浏览器访问官方文档（中优先级）
    if (demand.depth === 'advanced' || demand.depth === 'practical') {
      steps.push({
        id: `step_${demand.id}_docs`,
        type: 'browser_documentation',
        priority: 'medium',
        status: 'pending',
        params: {
          topic: demand.topic,
          sources: ['official_docs'],
          targetMastery: demand.targetMastery * 0.4
        }
      });
    }

    // 3. 实操阶段：内置浏览器访问实践社区（中优先级）
    if (demand.depth === 'practical') {
      steps.push({
        id: `step_${demand.id}_practical`,
        type: 'browser_practical',
        priority: 'medium',
        status: 'pending',
        params: {
          topic: demand.topic,
          sources: ['juejin', 'zhihu', 'stackoverflow'],
          targetMastery: demand.targetMastery * 0.2
        }
      });
    }

    // 4. 验证阶段：交叉验证所有来源（高优先级）
    steps.push({
      id: `step_${demand.id}_validation`,
      type: 'validation',
      priority: 'high',
      status: 'pending',
      params: {
        previousSteps: steps.map(s => s.id),
        targetMastery: demand.targetMastery
      }
    });

    // 按优先级排序
    steps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const path: LearningPath = {
      id: `path_${demand.id}_${Date.now()}`,
      demandId: demand.id,
      topic: demand.topic,
      targetMastery: demand.targetMastery,
      steps,
      status: 'pending',
      createdAt: Date.now()
    };

    return path;
  }

  /**
   * 执行学习路径
   */
  async executePath(path: LearningPath): Promise<PathExecutionResult> {
    path.status = 'in_progress';

    for (const step of path.steps) {
      if (step.status === 'completed' || step.status === 'skipped') {
        continue;
      }

      step.status = 'in_progress';

      try {
        // 根据步骤类型执行
        const result = await this.executeStep(step);
        step.result = result;
        step.status = 'completed';

        // 记录策略效果
        await this.programMemory.updateStrategyEffect(
          `step_type_${step.type}`,
          true
        );

      } catch (error: any) {
        step.error = error.message;
        
        // 记录失败
        await this.programMemory.updateStrategyEffect(
          `step_type_${step.type}`,
          false
        );

        // 决定是否继续
        if (step.priority === 'high') {
          // 关键步骤失败，尝试降级
          const fallbackResult = await this.tryFallback(step);
          if (fallbackResult) {
            step.result = fallbackResult;
            step.status = 'completed';
            continue;
          }
          path.status = 'failed';
          break;
        } else {
          // 非关键步骤失败，跳过
          step.status = 'skipped';
        }
      }
    }

    // 检查是否全部完成
    const completedSteps = path.steps.filter(s => s.status === 'completed').length;
    const allCompleted = completedSteps === path.steps.length;

    path.status = allCompleted ? 'completed' : 
                  completedSteps > 0 ? 'in_progress' : 'failed';
    
    if (path.status === 'completed') {
      path.completedAt = Date.now();
    }

    return {
      pathId: path.id,
      success: path.status === 'completed',
      completedSteps,
      totalSteps: path.steps.length,
      knowledgeId: path.status === 'completed' ? await this.createKnowledgeCard(path) : undefined,
      error: path.status === 'failed' ? '关键步骤执行失败' : undefined
    };
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: LearningStep): Promise<any> {
    // 从程序记忆获取最优策略
    const strategy = await this.programMemory.getOptimalStrategy(
      step.type.startsWith('brewapi') ? 'api' : 'browser'
    );

    switch (step.type) {
      case 'brewapi_basic':
      case 'brewapi_advanced':
        return await this.executeBrewAPIStep(step, strategy?.content);
      
      case 'browser_documentation':
      case 'browser_practical':
        return await this.executeBrowserStep(step, strategy?.content);
      
      case 'validation':
        return await this.executeValidationStep(step);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * 执行BrewAPI步骤
   */
  private async executeBrewAPIStep(step: LearningStep, strategy?: any): Promise<any> {
    const params = { ...strategy?.defaultParams, ...step.params };
    
    // 模拟BrewAPI调用（实际需要集成BrewAPI）
    console.log(`[PathPlanner] Executing BrewAPI step: ${step.id}`, params);
    
    return {
      success: true,
      content: `Learning content for ${params.query}`,
      source: 'brewapi',
      timestamp: Date.now()
    };
  }

  /**
   * 执行浏览器步骤
   */
  private async executeBrowserStep(step: LearningStep, strategy?: any): Promise<any> {
    const params = { ...strategy?.defaultParams, ...step.params };
    
    // 模拟浏览器学习（实际需要集成内置浏览器）
    console.log(`[PathPlanner] Executing browser step: ${step.id}`, params);
    
    return {
      success: true,
      content: `Browser learning content for ${params.topic}`,
      sources: params.sources,
      timestamp: Date.now()
    };
  }

  /**
   * 执行验证步骤
   */
  private async executeValidationStep(step: LearningStep): Promise<any> {
    // 模拟验证逻辑
    return {
      success: true,
      validated: true,
      confidence: 0.85,
      timestamp: Date.now()
    };
  }

  /**
   * 尝试降级方案
   */
  private async tryFallback(step: LearningStep): Promise<any | null> {
    // BrewAPI失败，尝试浏览器
    if (step.type.startsWith('brewapi')) {
      const fallbackStep: LearningStep = {
        ...step,
        id: `${step.id}_fallback`,
        type: 'browser_documentation',
        params: { ...step.params, fallback: true }
      };
      
      try {
        return await this.executeBrowserStep(fallbackStep);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * 从学习路径创建知识卡片
   */
  private async createKnowledgeCard(path: LearningPath): Promise<string> {
    // 合并所有步骤的内容
    let combinedContent = '';
    const sources: string[] = [];

    for (const step of path.steps) {
      if (step.result?.content) {
        combinedContent += step.result.content + '\n\n';
      }
      if (step.result?.source) {
        sources.push(step.result.source);
      }
      if (step.result?.sources) {
        sources.push(...step.result.sources);
      }
    }

    const knowledgeId = `kn_${path.topic.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}`;

    await this.semanticMemory.store({
      id: knowledgeId,
      title: path.topic,
      domain: this.extractDomain(path.topic),
      keywords: this.extractKeywords(path.topic),
      core_content: combinedContent.trim(),
      sources: [...new Set(sources)],
      mastery_score: 6, // 初始掌握度
      timeliness: 'latest',
      related_knowledge: []
    });

    return knowledgeId;
  }

  /**
   * 提取领域
   */
  private extractDomain(topic: string): string {
    const domainKeywords: Record<string, string[]> = {
      '前端': ['react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html'],
      '后端': ['node', 'python', 'java', 'go', 'rust', 'api', 'database'],
      'AI': ['gpt', 'llm', 'machine learning', 'deep learning', 'ai'],
    };

    const lowerTopic = topic.toLowerCase();
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(k => lowerTopic.includes(k))) {
        return domain;
      }
    }
    return 'general';
  }

  /**
   * 提取关键词
   */
  private extractKeywords(topic: string): string[] {
    const words = topic.split(/[\s,\-_]+/);
    return words.filter(w => w.length > 2).slice(0, 5);
  }
}
