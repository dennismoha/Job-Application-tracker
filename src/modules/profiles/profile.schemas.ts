import { z } from 'zod';

const profileFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  keywords: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  excludedKeywords: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  countries: z.array(z.string().trim().min(2).max(100)).max(50).default([]),
  locations: z.array(z.string().trim().min(1).max(150)).max(100).default([]),
  remoteOnly: z.boolean().default(false),
  minimumSalary: z.number().nonnegative().nullable().optional(),
  salaryCurrency: z.string().trim().length(3).toUpperCase().nullable().optional(),
  defaultFreshnessDays: z.number().int().min(1).max(365).default(7),
  defaultExpiryDays: z.number().int().min(1).max(730).default(30),
  enabled: z.boolean().default(true),
  categoryIds: z.array(z.string().min(1)).max(50).default([]),
};

export const createProfileSchema = z.object(profileFields);

export const updateProfileSchema = z.object({
  name: profileFields.name.optional(),
  description: profileFields.description,
  keywords: profileFields.keywords.optional(),
  excludedKeywords: profileFields.excludedKeywords.optional(),
  countries: profileFields.countries.optional(),
  locations: profileFields.locations.optional(),
  remoteOnly: profileFields.remoteOnly.optional(),
  minimumSalary: profileFields.minimumSalary,
  salaryCurrency: profileFields.salaryCurrency,
  defaultFreshnessDays: profileFields.defaultFreshnessDays.optional(),
  defaultExpiryDays: profileFields.defaultExpiryDays.optional(),
  enabled: profileFields.enabled.optional(),
  categoryIds: profileFields.categoryIds.optional(),
});
