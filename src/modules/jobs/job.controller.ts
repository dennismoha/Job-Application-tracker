import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../shared/http/http-error.js';
import {
  addJobListingSchema,
  changeListingSourceSchema,
  createJobNoteSchema,
  createManualJobSchema,
  listJobsSchema,
  moveListingSchema,
  shareJobsSchema,
  checkJobUrlSchema,
  updateJobStateSchema,
  updateJobSchema,
} from './job.schemas.js';
import { jobService } from './job.service.js';
import { jobSharingService } from './job-sharing.service.js';
import { verifyPublicUrl } from '../../shared/urls/url-integrity.js';
import { jobUrlService } from './job-url.service.js';

function currentUserId(req: Request): string {
  if (!req.currentUser) throw new UnauthorizedError();
  return req.currentUser.id;
}

export const jobController = {
  async share(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json(await jobSharingService.share(currentUserId(req), shareJobsSchema.parse(req.body))); } catch (error) { next(error); }
  },

  async checkUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = checkJobUrlSchema.parse(req.body);
      const { normalizedUrl, listing: existing } = await jobUrlService.findExisting(url, currentUserId(req));
      res.status(200).json({ normalizedUrl, duplicate: Boolean(existing), existing, verification: await verifyPublicUrl(url) });
    } catch (error) { next(error); }
  },
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = listJobsSchema.parse(req.query);
      res.status(200).json(await jobService.list(currentUserId(req), input));
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobService.get(req.params.jobId, currentUserId(req));
      res.status(200).json({ job });
    } catch (error) {
      next(error);
    }
  },

  async createManual(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createManualJobSchema.parse(req.body);
      const job = await jobService.createManual(currentUserId(req), input);
      res.status(201).json({ job });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateJobSchema.parse(req.body);
      res.status(200).json({ job: await jobService.updateOwnedJob(req.params.jobId, currentUserId(req), input) });
    } catch (error) { next(error); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await jobService.deleteOwnedJob(req.params.jobId, currentUserId(req)));
    } catch (error) { next(error); }
  },

  async updateState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateJobStateSchema.parse(req.body);
      const state = await jobService.updateState(req.params.jobId, currentUserId(req), input);
      res.status(200).json({ state });
    } catch (error) {
      next(error);
    }
  },

  async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createJobNoteSchema.parse(req.body);
      const note = await jobService.addNote(req.params.jobId, currentUserId(req), input.note);
      res.status(201).json({ note });
    } catch (error) {
      next(error);
    }
  },


  async addListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = addJobListingSchema.parse(req.body);
      const job = await jobService.addListing(currentUserId(req), req.params.jobId, input);
      res.status(201).json({ job });
    } catch (error) { next(error); }
  },

  async changeListingSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = changeListingSourceSchema.parse(req.body);
      const job = await jobService.changeListingSource(currentUserId(req), req.params.listingId, input.sourceId);
      res.status(200).json({ job });
    } catch (error) { next(error); }
  },

  async moveListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = moveListingSchema.parse(req.body);
      const job = await jobService.moveListing(currentUserId(req), req.params.listingId, input.targetJobId);
      res.status(200).json({ job });
    } catch (error) {
      next(error);
    }
  },
};
