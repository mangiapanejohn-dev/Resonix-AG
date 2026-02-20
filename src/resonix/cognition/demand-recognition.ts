/**
 * Resonix 自主认知体系 - 需求识别模块
 * 
 * 核心能力：知道"什么时候需要学习、学什么、学多深"
 * 结合用户交互场景+能力画像，生成学习需求清单
 */

import { SelfPerception, CapabilityProfile } from './self-perception.js';
import { EpisodicMemory } from '../memory/episodic-memory.js';

export interface LearningDemand {
  id: string;
  topic: string;
  domain: string;
  priority: number;           // 优先级 (0-100)
  trigger: 'gap' | 'timeliness' | 'deviation' | 'user_interaction';
  urgency: 'immediate' | 'scheduled' | 'idle';
  depth: 'basic' | 'advanced' | 'practical';
  targetMastery: number;     // 目标掌握度
  createdAt: number;
}

export interface LearningDemandList {
  demands: LearningDemand[];
  generatedAt: number;
  basedOnProfile: boolean;
}

export class DemandRecognition {
  private selfPerception: SelfPerception;
  private episodicMemory: EpisodicMemory;
  private currentDemands: LearningDemandList | null = null;

  constructor(selfPerception: SelfPerception, episodicMemory: EpisodicMemory) {
    this.selfPerception = selfPerception;
    this.episodicMemory = episodicMemory;
  }

  /**
   * 生成学习需求清单
   * 触发场景：缺口触发、时效触发、偏差触发、用户交互
   */
  async generateDemandList(): Promise<LearningDemandList> {
    const demands: LearningDemand[] = [];

    // 1. 缺口触发：能力画像中某知识点掌握度 < 6分
    const gaps = await this.selfPerception.identifyGaps();
    for (const gap of gaps) {
      const mastery = await this.selfPerception.checkMastery(gap);
      demands.push({
        id: `gap_${gap}`,
        topic: gap,
        domain: this.extractDomain(gap),
        priority: (10 - mastery) * 10, // 掌握度越低，优先级越高
        trigger: 'gap',
        urgency: mastery < 3 ? 'immediate' : 'scheduled',
        depth: mastery < 4 ? 'basic' : mastery < 6 ? 'advanced' : 'practical',
        targetMastery: 8,
        createdAt: Date.now()
      });
    }

    // 2. 时效触发：永久记忆中某知识点标记为"过时"
    const outdated = await this.selfPerception.identifyOutdated();
    for (const item of outdated) {
      demands.push({
        id: `time_${item}`,
        topic: item,
        domain: this.extractDomain(item),
        priority: 70,
        trigger: 'timeliness',
        urgency: 'scheduled',
        depth: 'advanced',
        targetMastery: 8,
        createdAt: Date.now()
      });
    }

    // 3. 偏差触发：从情景记忆获取用户反馈
    const deviations = await this.getDeviationDemands();
    demands.push(...deviations);

    // 4. 用户交互触发：从最近交互中识别学习需求
    const userDemands = await this.getUserInteractionDemands();
    demands.push(...userDemands);

    // 按优先级排序
    demands.sort((a, b) => b.priority - a.priority);

    // 限制同时处理的需求数量
    const topDemands = demands.slice(0, 10);

    this.currentDemands = {
      demands: topDemands,
      generatedAt: Date.now(),
      basedOnProfile: true
    };

    // 记录到情景记忆
    await this.episodicMemory.log({
      event_type: 'demand_generation',
      content: `生成了 ${topDemands.length} 个学习需求`,
      metadata: { demandCount: topDemands.length }
    });

    return this.currentDemands;
  }

  /**
   * 获取当前学习需求清单
   */
  getCurrentDemands(): LearningDemandList | null {
    return this.currentDemands;
  }

  /**
   * 从偏差记录生成学习需求
   */
  private async getDeviationDemands(): Promise<LearningDemand[]> {
    const demands: LearningDemand[] = [];
    
    // 从情景记忆获取最近的错误反馈
    const recentFeedback = await this.episodicMemory.search({
      event_type: 'user_feedback',
      content: 'error'
    });

    for (const event of recentFeedback.slice(0, 5)) {
      const topic = this.extractTopicFromFeedback(event.content || '');
      if (topic) {
        demands.push({
          id: `dev_${topic}`,
          topic,
          domain: this.extractDomain(topic),
          priority: 85,
          trigger: 'deviation',
          urgency: 'immediate',
          depth: 'practical',
          targetMastery: 9,
          createdAt: Date.now()
        });
      }
    }

    return demands;
  }

  /**
   * 从用户交互中识别学习需求
   */
  private async getUserInteractionDemands(): Promise<LearningDemand[]> {
    const demands: LearningDemand[] = [];
    
    // 获取最近的用户交互
    const recentInteractions = await this.episodicMemory.search({
      event_type: 'user_interaction'
    });

    // 识别用户询问的新主题
    const newTopics = new Set<string>();
    for (const interaction of recentInteractions.slice(0, 20)) {
      const topics = this.extractNewTopics(interaction.content || '');
      for (const topic of topics) {
        const mastery = await this.selfPerception.checkMastery(topic);
        if (mastery < 6) {
          newTopics.add(topic);
        }
      }
    }

    for (const topic of newTopics) {
      demands.push({
        id: `interact_${topic}`,
        topic,
        domain: this.extractDomain(topic),
        priority: 50,
        trigger: 'user_interaction',
        urgency: 'idle',
        depth: 'basic',
        targetMastery: 7,
        createdAt: Date.now()
      });
    }

    return demands;
  }

  /**
   * 从反馈内容提取主题
   */
  private extractTopicFromFeedback(content: string): string | null {
    // 简单的关键词提取
    const match = content.match(/(?:关于|关于|知识点)([\u4e00-\u9fa5a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * 从交互内容提取新主题
   */
  private extractNewTopics(content: string): string[] {
    // 简单的关键词提取
    const techTerms = content.match(/[A-Z][a-zA-Z0-9]+(?:\d+\.\d+)?/g) || [];
    const chineseTerms = content.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return [...new Set([...techTerms, ...chineseTerms])].slice(0, 5);
  }

  /**
   * 从主题提取领域
   */
  private extractDomain(topic: string): string {
    const domainKeywords: Record<string, string[]> = {
      '前端': ['react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html'],
      '后端': ['node', 'python', 'java', 'go', 'rust', 'api', 'database'],
      'AI': ['gpt', 'llm', 'machine learning', 'deep learning', 'ai', 'model'],
      'DevOps': ['docker', 'kubernetes', 'ci/cd', 'aws', 'cloud'],
      '移动端': ['ios', 'android', 'flutter', 'react native']
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
   * 标记需求已处理
   */
  async markDemandProcessed(demandId: string): Promise<void> {
    if (this.currentDemands) {
      this.currentDemands.demands = this.currentDemands.demands.filter(
        d => d.id !== demandId
      );
    }
  }

  /**
   * 获取高优先级需求
   */
  async getHighPriorityDemands(threshold: number = 70): Promise<LearningDemand[]> {
    if (!this.currentDemands || Date.now() - this.currentDemands.generatedAt > 30*60*1000) {
      await this.generateDemandList();
    }
    
    return (this.currentDemands?.demands || [])
      .filter(d => d.priority >= threshold)
      .sort((a, b) => {
        // 紧急需求优先
        if (a.urgency === 'immediate' && b.urgency !== 'immediate') return -1;
        if (b.urgency === 'immediate' && a.urgency !== 'immediate') return 1;
        return b.priority - a.priority;
      });
  }
}
