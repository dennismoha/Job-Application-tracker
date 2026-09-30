import { JobShareDelivery, JobVisibility } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

interface ShareInput { jobIds: string[]; recipients: string[]; subject?: string; message?: string }

function composeBody(jobs: Array<{ title: string; locationText: string | null; officialApplyUrl: string | null; company: { name: string } | null; listings: Array<{ sourceUrl: string | null; applyUrl: string | null; source: { name: string } }> }>, message?: string) {
  const intro = message?.trim() ? `${message.trim()}\n\n` : '';
  const lines = jobs.map((job, index) => {
    const listing = job.listings[0];
    const url = job.officialApplyUrl ?? listing?.applyUrl ?? listing?.sourceUrl ?? '';
    return [
      `${index + 1}. ${job.title}${job.company?.name ? ` — ${job.company.name}` : ''}`,
      job.locationText ? `Location: ${job.locationText}` : '',
      listing?.source?.name ? `Job Source: ${listing.source.name}` : '',
      url ? `Link: ${url}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
  return `${intro}${lines}`;
}

export const jobSharingService = {
  async share(userId: string, input: ShareInput) {
    const jobs = await prisma.job.findMany({
      where: { id: { in: input.jobIds }, OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] },
      include: { company: true, listings: { include: { source: { select: { name: true } } }, orderBy: [{ isOfficial: 'desc' }, { firstSeenAt: 'asc' }] } },
    });
    if (jobs.length !== new Set(input.jobIds).size) throw new NotFoundError('One or more selected jobs could not be found.');
    const subject = input.subject?.trim() || (jobs.length === 1 ? `Job opportunity: ${jobs[0]!.title}` : `${jobs.length} job opportunities`);
    const body = composeBody(jobs, input.message);
    const webhookUrl = process.env.JOB_SHARE_WEBHOOK_URL?.trim();

    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, recipients: input.recipients, subject, text: body, jobs: jobs.map((job) => ({ id: job.id, title: job.title, company: job.company?.name ?? null })) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new BadRequestError(`The email delivery webhook returned HTTP ${response.status}.`);
      const share = await prisma.jobShare.create({ data: { userId, jobIds: input.jobIds, recipients: input.recipients, subject, message: input.message ?? null, delivery: JobShareDelivery.EMAIL_WEBHOOK, deliveryReference: response.headers.get('x-request-id') } });
      return { share, delivery: 'EMAIL_WEBHOOK' as const, mailtoUrl: null };
    }

    const mailtoUrl = `mailto:${input.recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const share = await prisma.jobShare.create({ data: { userId, jobIds: input.jobIds, recipients: input.recipients, subject, message: input.message ?? null, delivery: JobShareDelivery.EMAIL_CLIENT } });
    return { share, delivery: 'EMAIL_CLIENT' as const, mailtoUrl };
  },
};
