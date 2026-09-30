import { RiskLevel, type RiskReasonType } from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

async function assertTarget(input: { sourceId?: string; companyId?: string; jobId?: string }) {
  if (input.sourceId) {
    const source = await prisma.source.findUnique({ where: { id: input.sourceId }, select: { id: true } });
    if (!source) throw new NotFoundError('Source not found.');
  }
  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true } });
    if (!company) throw new NotFoundError('Company not found.');
  }
  if (input.jobId) {
    const job = await prisma.job.findUnique({ where: { id: input.jobId }, select: { id: true } });
    if (!job) throw new NotFoundError('Job not found.');
  }
}

const severity: Record<RiskLevel, number> = {
  UNKNOWN: 0,
  GREEN: 1,
  YELLOW: 2,
  ORANGE: 3,
  RED: 4,
};

export const riskService = {
  async create(
    userId: string,
    input: {
      sourceId?: string;
      companyId?: string;
      jobId?: string;
      level: RiskLevel;
      reasonType: RiskReasonType;
      reason: string;
      evidenceUrl?: string;
    },
  ) {
    await assertTarget(input);
    return prisma.riskReport.create({
      data: {
        userId,
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.companyId ? { companyId: input.companyId } : {}),
        ...(input.jobId ? { jobId: input.jobId } : {}),
        level: input.level,
        reasonType: input.reasonType,
        reason: input.reason,
        ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl } : {}),
      },
    });
  },

  list(
    userId: string,
    input: { sourceId?: string; companyId?: string; jobId?: string; level?: RiskLevel; limit: number },
  ) {
    return prisma.riskReport.findMany({
      where: {
        userId,
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.companyId ? { companyId: input.companyId } : {}),
        ...(input.jobId ? { jobId: input.jobId } : {}),
        ...(input.level ? { level: input.level } : {}),
      },
      include: {
        source: { select: { id: true, name: true, systemRiskLevel: true } },
        company: { select: { id: true, name: true, systemRiskLevel: true } },
        job: { select: { id: true, title: true, systemRiskLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });
  },

  async remove(userId: string, reportId: string) {
    const report = await prisma.riskReport.findFirst({ where: { id: reportId, userId } });
    if (!report) throw new NotFoundError('Risk report not found.');
    await prisma.riskReport.delete({ where: { id: reportId } });
  },

  async effectiveUserRisk(userId: string, input: { sourceId?: string; companyId?: string; jobId?: string }) {
    await assertTarget(input);
    const reports = await prisma.riskReport.findMany({
      where: {
        userId,
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.companyId ? { companyId: input.companyId } : {}),
        ...(input.jobId ? { jobId: input.jobId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const highest = reports.reduce<RiskLevel>(
      (current, report) => (severity[report.level] > severity[current] ? report.level : current),
      RiskLevel.UNKNOWN,
    );

    return { level: highest, reports };
  },
};
