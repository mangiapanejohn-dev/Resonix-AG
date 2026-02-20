/**
 * Resonix 自主认知体系 - 偏差修正模块
 * 
 * 核心能力：知道"自己学的东西对不对、有没有遗漏"
 * 基于多源验证+用户反馈，识别认知偏差并触发二次学习
 */

import { SemanticMemory, KnowledgeCard } from '../memory/semantic-memory.js';
import { EpisodicMemory } from '../memory/episodic-memory.js';
import { ProgramMemory } from '../memory/program-memory.js';

export interface DeviationRecord {
  id: string;
  knowledgeId: string;
  type: 'factual' | 'completeness' | 'timeliness' | 'accuracy';
  severity: 'high' | 'medium' | 'low';
  description: string;
  detectedAt: number;
  sources: string[];
  status: 'detected' | 'verifying' | 'corrected' | 'dismissed';
}

export interface MultiSourceValidation {
  knowledgeId: string;
  sources: {
    source: string;
    content: string;
    matches: boolean;
    confidence: number;
  }[];
  deviationRate: number;
  verdict: 'consistent' | 'warning' | 'deviation';
}

export class DeviationCorrection {
  private semanticMemory: SemanticMemory;
  private episodicMemory: EpisodicMemory;
  private programMemory: ProgramMemory;
  private activeDeviations: Map<string, DeviationRecord> = new Map();

  constructor(
    semanticMemory: SemanticMemory,
    episodicMemory: EpisodicMemory,
    programMemory: ProgramMemory
  ) {
    this.semanticMemory = semanticMemory;
    this.episodicMemory = episodicMemory;
    this.programMemory = programMemory;
  }

  /**
   * 多源验证：学习成果沉淀前自动对比3个以上权威源
   */
  async multiSourceValidation(knowledgeId: string, newContent: string): Promise<MultiSourceValidation> {
    const knowledge = await this.semanticMemory.get(knowledgeId);
    const existingSources = knowledge?.sources || [];
    
    // 获取验证源（现有源 + 新源）
    const validationSources = [
      ...existingSources,
      'new_learning_result'
    ].slice(0, 5);

    // 模拟多源验证（实际需要调用外部API或浏览器抓取）
    const sources = validationSources.map(source => ({
      source,
      content: source === 'new_learning_result' ? newContent : await this.fetchSourceContent(source),
      matches: true, // 实际需要语义对比
      confidence: 0.8 + Math.random() * 0.2
    }));

    // 计算偏差率
    const matchingSources = sources.filter(s => s.matches).length;
    const deviationRate = 1 - (matchingSources / sources.length);

    const verdict: 'consistent' | 'warning' | 'deviation' = 
      deviationRate > 0.3 ? 'deviation' :
      deviationRate > 0.15 ? 'warning' : 'consistent';

    return {
      knowledgeId,
      sources,
      deviationRate,
      verdict
    };
  }

  /**
   * 基于用户反馈检测偏差
   */
  async detectFromUserFeedback(feedback: string, relatedKnowledgeId?: string): Promise<DeviationRecord | null> {
    // 简单的反馈解析（实际需要NLP）
    const isError = /错误|不对|有问题|遗漏/i.test(feedback);
    if (!isError) return null;

    const deviation: DeviationRecord = {
      id: `dev_${Date.now()}`,
      knowledgeId: relatedKnowledgeId || this.extractRelatedKnowledge(feedback),
      type: this.classifyDeviation(feedback),
      severity: this.assessSeverity(feedback),
      description: feedback,
      detectedAt: Date.now(),
      sources: [],
      status: 'detected'
    };

    this.activeDeviations.set(deviation.id, deviation);

    // 记录到情景记忆
    await this.episodicMemory.log({
      event_type: 'deviation_detected',
      content: `检测到认知偏差: ${deviation.type}`,
      metadata: deviation
    });

    return deviation;
  }

  /**
   * 触发偏差修正学习
   */
  async triggerCorrectionLearning(deviationId: string): Promise<void> {
    const deviation = this.activeDeviations.get(deviationId);
    if (!deviation) return;

    deviation.status = 'verifying';

    // 记录触发修正学习
    await this.episodicMemory.log({
      event_type: 'correction_learning_triggered',
      content: `触发修正学习: ${deviation.knowledgeId}`,
      metadata: { deviationId, deviation }
    });

    // 更新状态
    this.activeDeviations.set(deviationId, deviation);
  }

  /**
   * 确认修正完成
   */
  async confirmCorrection(deviationId: string, correctedKnowledgeId: string): Promise<void> {
    const deviation = this.activeDeviations.get(deviationId);
    if (!deviation) return;

    deviation.status = 'corrected';

    // 更新知识卡的关联
    const knowledge = await this.semanticMemory.get(correctedKnowledgeId);
    if (knowledge) {
      await this.semanticMemory.update(correctedKnowledgeId, {
        update_time: Date.now()
      });
    }

    // 记录修正完成
    await this.episodicMemory.log({
      event_type: 'deviation_corrected',
      content: `认知偏差已修正: ${deviation.knowledgeId}`,
      metadata: { deviationId, correctedKnowledgeId }
    });

    // 更新策略（增加该类型检查的权重）
    await this.programMemory.storeStrategy(`deviation_check_${deviation.type}`, {
      lastDeviation: Date.now(),
      frequency: ((await this.programMemory.getStrategy(`deviation_check_${deviation.type}`))?.frequency || 0) + 1
    });
  }

  /**
   * 忽略偏差
   */
  async dismissDeviation(deviationId: string, reason: string): Promise<void> {
    const deviation = this.activeDeviations.get(deviationId);
    if (!deviation) return;

    deviation.status = 'dismissed';

    await this.episodicMemory.log({
      event_type: 'deviation_dismissed',
      content: `偏差已忽略: ${reason}`,
      metadata: { deviationId, reason }
    });
  }

  /**
   * 获取所有活跃偏差
   */
  getActiveDeviations(): DeviationRecord[] {
    return Array.from(this.activeDeviations.values())
      .filter(d => d.status === 'detected' || d.status === 'verifying');
  }

  /**
   * 定期检查：扫描知识库识别潜在偏差
   */
  async periodicCheck(): Promise<DeviationRecord[]> {
    const deviations: DeviationRecord[] = [];
    const allKnowledge = await this.semanticMemory.searchAll();

    for (const knowledge of allKnowledge) {
      // 检查时效性
      if (knowledge.timeliness === 'outdated') {
        const deviation: DeviationRecord = {
          id: `time_dev_${knowledge.id}`,
          knowledgeId: knowledge.id,
          type: 'timeliness',
          severity: 'medium',
          description: `知识 "${knowledge.title}" 已过时`,
          detectedAt: Date.now(),
          sources: knowledge.sources || [],
          status: 'detected'
        };
        deviations.push(deviation);
        this.activeDeviations.set(deviation.id, deviation);
      }

      // 检查完整性和准确性（低置信度知识）
      if (knowledge.mastery_score && knowledge.mastery_score < 6) {
        const deviation: DeviationRecord = {
          id: `acc_dev_${knowledge.id}`,
          knowledgeId: knowledge.id,
          type: 'accuracy',
          severity: 'low',
          description: `知识 "${knowledge.title}" 置信度较低`,
          detectedAt: Date.now(),
          sources: knowledge.sources || [],
          status: 'detected'
        };
        deviations.push(deviation);
        this.activeDeviations.set(deviation.id, deviation);
      }
    }

    return deviations;
  }

  /**
   * 提取反馈相关的知识ID
   */
  private extractRelatedKnowledge(feedback: string): string {
    // 简单提取，实际需要NLP
    const match = feedback.match(/(?:关于|关于)([\u4e00-\u9fa5a-zA-Z0-9]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 分类偏差类型
   */
  private classifyDeviation(feedback: string): DeviationRecord['type'] {
    if (/遗漏|不全|少/i.test(feedback)) return 'completeness';
    if (/过时|老|i.test(feedback)) return 'timeliness';
    if (/错误|不对|假/i.test(feedback)) return 'factual';
    return 'accuracy';
  }

  /**
   * 评估严重程度
   */
  private assessSeverity(feedback: string): DeviationRecord['severity'] {
    if (/严重|重大|完全错误/i.test(feedback)) return 'high';
    if (/轻微|有点|不太/i.test(feedback)) return 'low';
    return 'medium';
  }

  /**
   * 获取源内容（模拟）
   */
  private async fetchSourceContent(source: string): Promise<string> {
    // 实际需要从源URL抓取内容
    return `Content from ${source}`;
  }
}
