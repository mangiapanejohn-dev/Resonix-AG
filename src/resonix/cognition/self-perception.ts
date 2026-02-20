/**
 * Resonix 自主认知体系 - 自我感知模块
 * 
 * 核心能力：知道"自己会什么、不会什么、会的东西是否过时"
 * 生成能力画像，基于永久记忆的检索+量化评分
 */

import { SemanticMemory } from "./semantic-memory.js";
import { ProgramMemory } from "./program-memory.js";

export interface CapabilityDimension {
  domain: string;                    // 领域（如：前端/后端/AI）
  masteryScore: number;              // 掌握度评分 (0-10)
  skillLevel: 'theory' | 'practical' | 'mastered'; // 技能熟练度
  timeliness: 'latest' | 'valid' | 'outdated';    // 时效性
  lastUsed: number;                 // 最后使用时间戳
  usageCount: number;               // 使用次数
}

export interface CapabilityProfile {
  overallScore: number;              // 整体评分
  dimensions: Map<string, CapabilityDimension>;
  gaps: string[];                   // 知识缺口列表
  outdated: string[];                // 过时知识列表
  strengths: string[];               // 优势领域
  generatedAt: number;              // 生成时间
}

export interface KnowledgeBenchmark {
  domain: string;
  topic: string;
  expectedMastery: number;
  lastUpdated: number;
}

export class SelfPerception {
  private semanticMemory: SemanticMemory;
  private programMemory: ProgramMemory;
  private profile: CapabilityProfile | null = null;
  private benchmarkCache: KnowledgeBenchmark[] = [];

  constructor(semanticMemory: SemanticMemory, programMemory: ProgramMemory) {
    this.semanticMemory = semanticMemory;
    this.programMemory = programMemory;
  }

  /**
   * 生成完整的能力画像
   * 每小时定期执行
   */
  async generateCapabilityProfile(): Promise<CapabilityProfile> {
    const dimensions = new Map<string, CapabilityDimension>();
    const allKnowledge = await this.semanticMemory.searchAll();

    // 按领域分组计算掌握度
    const domainStats = new Map<string, {
      totalScore: number;
      count: number;
      topics: string[];
      latestUpdate: number;
      outdated: string[];
    }>();

    for (const knowledge of allKnowledge) {
      const domain = knowledge.domain || 'general';
      const stats = domainStats.get(domain) || {
        totalScore: 0,
        count: 0,
        topics: [],
        latestUpdate: 0,
        outdated: []
      };

      stats.totalScore += knowledge.mastery_score || 0;
      stats.count++;
      stats.topics.push(knowledge.id);
      stats.latestUpdate = Math.max(stats.latestUpdate, knowledge.update_time || 0);
      
      if (knowledge.timeliness === 'outdated') {
        stats.outdated.push(knowledge.id);
      }

      domainStats.set(domain, stats);
    }

    // 生成每个领域的能力维度
    let totalScore = 0;
    let totalCount = 0;
    const gaps: string[] = [];
    const outdated: string[] = [];
    const strengths: string[] = [];

    for (const [domain, stats] of domainStats) {
      const avgScore = stats.count > 0 ? stats.totalScore / stats.count : 0;
      
      // 判断是否为缺口（评分 < 6）
      if (avgScore < 6) {
        gaps.push(...stats.topics.filter(t => {
          const kn = allKnowledge.find(k => k.id === t);
          return kn && (kn.mastery_score || 0) < 6;
        }));
      }

      // 判断是否过时
      outdated.push(...stats.outdated);

      // 判断是否为优势（评分 >= 8）
      if (avgScore >= 8) {
        strengths.push(domain);
      }

      const dimension: CapabilityDimension = {
        domain,
        masteryScore: Math.round(avgScore * 10) / 10,
        skillLevel: avgScore >= 8 ? 'mastered' : avgScore >= 5 ? 'practical' : 'theory',
        timeliness: stats.outdated.length > 0 ? 'outdated' : 
                   (Date.now() - stats.latestUpdate < 90*24*60*60*1000) ? 'latest' : 'valid',
        lastUsed: stats.latestUpdate,
        usageCount: stats.count
      };

      dimensions.set(domain, dimension);
      totalScore += avgScore * stats.count;
      totalCount += stats.count;
    }

    const overallScore = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;

    this.profile = {
      overallScore,
      dimensions,
      gaps,
      outdated,
      strengths,
      generatedAt: Date.now()
    };

    // 缓存到程序记忆
    await this.programMemory.storeStrategy('capability_profile', {
      profile: this.profile,
      benchmarks: this.benchmarkCache
    });

    return this.profile;
  }

  /**
   * 获取当前能力画像
   */
  getProfile(): CapabilityProfile | null {
    return this.profile;
  }

  /**
   * 检查特定知识点的掌握度
   */
  async checkMastery(knowledgeId: string): Promise<number> {
    const knowledge = await this.semanticMemory.get(knowledgeId);
    return knowledge?.mastery_score || 0;
  }

  /**
   * 识别知识缺口
   */
  async identifyGaps(): Promise<string[]> {
    if (!this.profile || Date.now() - this.profile.generatedAt > 60*60*1000) {
      await this.generateCapabilityProfile();
    }
    return this.profile?.gaps || [];
  }

  /**
   * 识别过时知识
   */
  async identifyOutdated(): Promise<string[]> {
    if (!this.profile || Date.now() - this.profile.generatedAt > 60*60*1000) {
      await this.generateCapabilityProfile();
    }
    return this.profile?.outdated || [];
  }

  /**
   * 获取优势领域
   */
  async getStrengths(): Promise<string[]> {
    if (!this.profile || Date.now() - this.profile.generatedAt > 60*60*1000) {
      await this.generateCapabilityProfile();
    }
    return this.profile?.strengths || [];
  }

  /**
   * 更新特定知识的掌握度（基于使用反馈）
   */
  async updateMastery(knowledgeId: string, delta: number): Promise<void> {
    const knowledge = await this.semanticMemory.get(knowledgeId);
    if (knowledge) {
      const newScore = Math.min(10, Math.max(0, (knowledge.mastery_score || 0) + delta));
      await this.semanticMemory.update(knowledgeId, {
        mastery_score: newScore,
        update_time: Date.now()
      });
      
      // 标记需要重新生成画像
      this.profile = null;
    }
  }
}
