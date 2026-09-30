-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('JOB_BOARD', 'COMPANY_CAREERS', 'ORGANIZATION_WEBSITE', 'ATS', 'RECRUITER', 'NEWSLETTER', 'OTHER', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "CollectionCapability" AS ENUM ('CRAWLABLE', 'RESTRICTED', 'MANUAL_ONLY', 'EMAIL_ONLY', 'SEARCH_ONLY', 'UNKNOWN', 'DISABLED');

-- CreateEnum
CREATE TYPE "JobShareDelivery" AS ENUM ('EMAIL_WEBHOOK', 'EMAIL_CLIENT');

-- CreateEnum
CREATE TYPE "AcquisitionMethod" AS ENUM ('CRAWLER', 'BROWSER_COMPANION', 'UNIVERSAL_SEARCH', 'EMAIL', 'MANUAL', 'API', 'IMPORT');

-- CreateEnum
CREATE TYPE "SourceAccessState" AS ENUM ('UNKNOWN', 'OPEN', 'REQUIRES_LOGIN', 'CHALLENGED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SourceHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'CHALLENGED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('UNKNOWN', 'GREEN', 'YELLOW', 'ORANGE', 'RED');

-- CreateEnum
CREATE TYPE "AuditConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('SCHEDULED_CRAWL', 'MANUAL_CRAWL', 'EMAIL_INGESTION', 'WEB_SEARCH', 'MANUAL_JOB_ENTRY', 'SOURCE_AUDIT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'RATE_LIMITED', 'CHALLENGED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('RECEIVED', 'EXTRACTING', 'NORMALIZED', 'VALIDATED', 'DEDUPLICATED', 'PERSISTED', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('API', 'ATS', 'RSS', 'JSON_LD', 'SOURCE_PARSER', 'GENERIC_HTML', 'LLM', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED', 'SCAM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED', 'REMOVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FreshnessStatus" AS ENUM ('NEW', 'RECENT', 'AGING', 'OLD', 'VERY_OLD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DateConfidence" AS ENUM ('EXACT', 'INFERRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RemoteType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "UserJobDisposition" AS ENUM ('NONE', 'SAVED', 'IGNORED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'ACCEPTED', 'DECLINED', 'REJECTED', 'WITHDRAWN', 'NO_RESPONSE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationEventType" AS ENUM ('APPLIED', 'RESPONSE_RECEIVED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'INTERVIEW_ATTENDED', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'WITHDRAWN', 'NO_RESPONSE', 'NOTE', 'CLOSED');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'POSSIBLY_ELIGIBLE', 'INELIGIBLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RiskReasonType" AS ENUM ('USER_MARKED', 'REQUESTED_PAYMENT', 'SUSPICIOUS_EMAIL', 'FAKE_COMPANY', 'FAKE_JOB', 'DUPLICATE_SPAM', 'MISLEADING_JOB', 'EXPIRED_JOB', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailFreshness" AS ENUM ('RECENT', 'OLD', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DeduplicationMethod" AS ENUM ('EXTERNAL_ID', 'JOB_REFERENCE', 'APPLY_URL', 'FINGERPRINT', 'FUZZY_MATCH', 'LLM', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeduplicationDecision" AS ENUM ('SAME_JOB', 'DIFFERENT_JOB', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "JobStatusEventType" AS ENUM ('DISCOVERED', 'UPDATED', 'EXPIRED', 'CLOSED', 'REOPENED', 'MARKED_SCAM');

-- CreateEnum
CREATE TYPE "JobVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AiTaskType" AS ENUM ('EXTRACTION', 'PROFILE_MATCH', 'ELIGIBILITY', 'SUMMARY', 'DEDUPLICATION', 'SOURCE_REVIEW', 'BROWSER_PAGE_ANALYSIS', 'CV_STRUCTURE', 'CV_REQUIREMENT_EXTRACTION', 'CV_MATCH', 'CV_TAILORING', 'COVER_LETTER', 'APPLICATION_ASSISTANT', 'INTERVIEW_PREP', 'MARKET_INTELLIGENCE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('ACHIEVEMENT', 'PROJECT', 'RESPONSIBILITY', 'CERTIFICATION', 'TECHNOLOGY', 'TEACHING_ACHIEVEMENT', 'METRIC', 'EDUCATION', 'LANGUAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationPackStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CoverLetterStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FINAL');

-- CreateEnum
CREATE TYPE "FollowUpActionType" AS ENUM ('WAIT', 'FOLLOW_UP', 'THANK_YOU', 'PREPARE_INTERVIEW', 'DECIDE_OFFER', 'NONE');

-- CreateEnum
CREATE TYPE "FollowUpState" AS ENUM ('SUGGESTED', 'DONE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('RECEIVED', 'NEGOTIATING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PriorityBucket" AS ENUM ('HIGH_ATTENTION', 'REVIEW', 'LATER', 'LOW_PRIORITY');

-- CreateEnum
CREATE TYPE "SearchCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SmartNotificationType" AS ENUM ('STRONG_MATCH', 'CLOSING_SOON', 'SOURCE_RECOVERED', 'JOB_CHANGED', 'FOLLOW_UP_DUE', 'INTERVIEW_UPCOMING', 'OFFER_ACTION', 'CV_MATCH');

-- CreateEnum
CREATE TYPE "SmartNotificationState" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CvSourceType" AS ENUM ('UPLOADED', 'BUILDER', 'TAILORED');

-- CreateEnum
CREATE TYPE "CvRequirementKind" AS ENUM ('REQUIRED', 'PREFERRED', 'SKILL', 'OTHER');

-- CreateEnum
CREATE TYPE "CvMatchStatus" AS ENUM ('EVIDENCED', 'PARTIAL', 'NOT_EVIDENCED', 'NEEDS_CONFIRMATION', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CvTailoringStatus" AS ENUM ('DRAFT', 'READY', 'SAVED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "CvSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EDITED', 'IGNORED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowserCompanionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowserCompanionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "minimumSalary" DECIMAL(12,2),
    "salaryCurrency" TEXT,
    "defaultFreshnessDays" INTEGER NOT NULL DEFAULT 7,
    "defaultExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "JobCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "JobTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "careersUrl" TEXT,
    "country" TEXT,
    "city" TEXT,
    "systemRiskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "collectionCapability" "CollectionCapability" NOT NULL DEFAULT 'UNKNOWN',
    "accessState" "SourceAccessState" NOT NULL DEFAULT 'UNKNOWN',
    "baseUrl" TEXT NOT NULL,
    "normalizedDomain" TEXT,
    "careersUrl" TEXT,
    "createdByUserId" TEXT,
    "systemOwned" BOOLEAN NOT NULL DEFAULT false,
    "requiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "antiBotObserved" BOOLEAN NOT NULL DEFAULT false,
    "emailAlertsAvailable" BOOLEAN NOT NULL DEFAULT false,
    "emailAlertsUrl" TEXT,
    "accountUrl" TEXT,
    "defaultIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "minimumRequestDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "maxRequestsPerRun" INTEGER NOT NULL DEFAULT 20,
    "systemRiskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "lastAuditedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSourceAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "accountExists" BOOLEAN NOT NULL DEFAULT false,
    "emailAlertsSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "usernameHint" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSourceAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSchedule" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessfulRunAt" TIMESTAMP(3),
    "pausedUntil" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "circuitState" "CircuitState" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerConfig" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "pausedUntil" TIMESTAMP(3),
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maximumPages" INTEGER NOT NULL DEFAULT 5,
    "maximumRequests" INTEGER NOT NULL DEFAULT 20,
    "requestDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "circuitState" "CircuitState" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSubscription" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredIntervalMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceAudit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "httpStatus" INTEGER,
    "responseTimeMs" INTEGER,
    "finalUrl" TEXT,
    "robotsAvailable" BOOLEAN,
    "robotsAllows" BOOLEAN,
    "atsProvider" TEXT,
    "hasApi" BOOLEAN NOT NULL DEFAULT false,
    "hasRss" BOOLEAN NOT NULL DEFAULT false,
    "hasJsonLd" BOOLEAN NOT NULL DEFAULT false,
    "hasJobPosting" BOOLEAN NOT NULL DEFAULT false,
    "isJavascriptHeavy" BOOLEAN NOT NULL DEFAULT false,
    "requiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "challengeDetected" BOOLEAN NOT NULL DEFAULT false,
    "emailAlertsAvailable" BOOLEAN NOT NULL DEFAULT false,
    "applicationLinksFound" BOOLEAN NOT NULL DEFAULT false,
    "recommendedCapability" "CollectionCapability" NOT NULL,
    "confidence" "AuditConfidence" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SourceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceHealth" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "SourceHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "successRate" DOUBLE PRECISION,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "expectedListingCount" INTEGER,
    "lastListingCount" INTEGER,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastChallengeAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "scheduleId" TEXT,
    "crawlerConfigId" TEXT,
    "runType" "RunType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "pagesRequested" INTEGER NOT NULL DEFAULT 0,
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "newListings" INTEGER NOT NULL DEFAULT 0,
    "updatedListings" INTEGER NOT NULL DEFAULT 0,
    "unchangedListings" INTEGER NOT NULL DEFAULT 0,
    "newJobs" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "quarantined" INTEGER NOT NULL DEFAULT 0,
    "httpStatus" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailIngestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "messageId" TEXT NOT NULL,
    "sender" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "freshness" "EmailFreshness" NOT NULL DEFAULT 'UNKNOWN',
    "recentFolderAssigned" BOOLEAN NOT NULL DEFAULT false,
    "oldFolderAssigned" BOOLEAN NOT NULL DEFAULT false,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "rawMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobIngestion" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "acquisitionRunId" TEXT,
    "emailIngestionId" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RECEIVED',
    "extractionMethod" "ExtractionMethod",
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "rawPayload" JSONB NOT NULL,
    "extractedPayload" JSONB,
    "normalizedPayload" JSONB,
    "errorMessage" TEXT,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "JobVisibility" NOT NULL DEFAULT 'PUBLIC',
    "primaryCategoryId" TEXT,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "city" TEXT,
    "country" TEXT,
    "locationText" TEXT,
    "remoteType" "RemoteType" NOT NULL DEFAULT 'UNSPECIFIED',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'UNSPECIFIED',
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "salaryCurrency" TEXT,
    "salaryPeriod" "SalaryPeriod" NOT NULL DEFAULT 'UNSPECIFIED',
    "salaryText" TEXT,
    "officialApplyUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "academicYear" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'UNKNOWN',
    "freshnessStatus" "FreshnessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "earliestPostedAt" TIMESTAMP(3),
    "latestPostedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "fingerprint" TEXT,
    "systemRiskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "acquisitionMethod" "AcquisitionMethod" NOT NULL DEFAULT 'MANUAL',
    "ingestionId" TEXT,
    "acquisitionRunId" TEXT,
    "externalId" TEXT,
    "requisitionId" TEXT,
    "listingKey" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "normalizedUrl" TEXT,
    "applyUrl" TEXT,
    "rawTitle" TEXT,
    "rawDescription" TEXT,
    "rawLocation" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedDateConfidence" "DateConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "status" "ListingStatus" NOT NULL DEFAULT 'UNKNOWN',
    "contentHash" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isRepost" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListingRevision" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobListingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListingMatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "method" "DeduplicationMethod" NOT NULL,
    "decision" "DeduplicationDecision" NOT NULL DEFAULT 'SAME_JOB',
    "evidence" JSONB,
    "manuallyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProfileMatch" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "eligibility" "EligibilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" JSONB,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobProfileMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJobState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "disposition" "UserJobDisposition" NOT NULL DEFAULT 'NONE',
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),
    "ignoredAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "customExpiresAt" TIMESTAMP(3),
    "preferredCvVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJobState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "searchProfileId" TEXT,
    "sourceListingId" TEXT,
    "foundSourceId" TEXT,
    "appliedSourceId" TEXT,
    "cvVersionId" TEXT,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whereAppliedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicationId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "companyId" TEXT,
    "jobId" TEXT,
    "level" "RiskLevel" NOT NULL,
    "reasonType" "RiskReasonType" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatusEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "JobStatusEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "JobStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "organization" TEXT,
    "role" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "sourceLabel" TEXT,
    "sourceCvVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSnapshot" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicationPackId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "sourceUrl" TEXT,
    "contentHash" TEXT,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "JobSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationPackStatus" NOT NULL DEFAULT 'DRAFT',
    "cvVersionId" TEXT,
    "sourceUrl" TEXT,
    "answers" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CoverLetterStatus" NOT NULL DEFAULT 'DRAFT',
    "requirementsCovered" JSONB,
    "evidenceEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewWorkspace" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "location" TEXT,
    "likelyAreas" JSONB,
    "starExamples" JSONB,
    "questionsToAsk" JSONB,
    "prepNotes" TEXT,
    "questionsAsked" JSONB,
    "outcomeNotes" TEXT,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "organization" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationContact" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "action" "FollowUpActionType" NOT NULL,
    "state" "FollowUpState" NOT NULL DEFAULT 'SUGGESTED',
    "dueAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'RECEIVED',
    "salary" DECIMAL(12,2),
    "currency" TEXT,
    "bonusText" TEXT,
    "housingText" TEXT,
    "transportText" TEXT,
    "medicalText" TEXT,
    "visaText" TEXT,
    "schoolFeesText" TEXT,
    "leaveText" TEXT,
    "contractDurationText" TEXT,
    "remotePolicyText" TEXT,
    "startDate" TIMESTAMP(3),
    "probationText" TEXT,
    "noticePeriodText" TEXT,
    "otherBenefits" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "name" TEXT NOT NULL,
    "status" "SearchCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobShare" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobIds" TEXT[],
    "recipients" TEXT[],
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "delivery" "JobShareDelivery" NOT NULL,
    "deliveryReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SmartNotificationType" NOT NULL,
    "state" "SmartNotificationState" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "actionUrl" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "SmartNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPriority" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT,
    "bucket" "PriorityBucket" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cv" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvVersion" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "sourceType" "CvSourceType" NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "originalFileData" BYTEA,
    "plainText" TEXT NOT NULL,
    "structuredData" JSONB,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvProfileLink" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "CvRequirementKind" NOT NULL,
    "text" TEXT NOT NULL,
    "normalizedKey" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT NOT NULL DEFAULT 'JOB_DESCRIPTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCvMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cvVersionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "summary" TEXT,
    "evidencedCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "notEvidencedCount" INTEGER NOT NULL DEFAULT 0,
    "needsConfirmationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCvMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCvMatchItem" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "requirementId" TEXT,
    "requirementText" TEXT NOT NULL,
    "status" "CvMatchStatus" NOT NULL,
    "evidence" TEXT,
    "suggestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCvMatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvTailoringSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "baseCvVersionId" TEXT NOT NULL,
    "matchId" TEXT,
    "createdVersionId" TEXT,
    "status" "CvTailoringStatus" NOT NULL DEFAULT 'DRAFT',
    "workingText" TEXT NOT NULL,
    "workingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvTailoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvTailoringSuggestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requirementText" TEXT,
    "section" TEXT,
    "beforeText" TEXT,
    "afterText" TEXT,
    "reason" TEXT NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedFact" TEXT,
    "status" "CvSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvTailoringSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "profileId" TEXT,
    "jobId" TEXT,
    "task" "AiTaskType" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfileCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfileCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_JobTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrowserCompanionToken_tokenHash_key" ON "BrowserCompanionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "BrowserCompanionToken_userId_revokedAt_idx" ON "BrowserCompanionToken"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "SearchProfile_userId_idx" ON "SearchProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCategory_slug_key" ON "JobCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "JobTag_slug_key" ON "JobTag"("slug");

-- CreateIndex
CREATE INDEX "Company_normalizedName_idx" ON "Company"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Source_normalizedDomain_key" ON "Source"("normalizedDomain");

-- CreateIndex
CREATE INDEX "Source_sourceType_idx" ON "Source"("sourceType");

-- CreateIndex
CREATE INDEX "Source_collectionCapability_idx" ON "Source"("collectionCapability");

-- CreateIndex
CREATE INDEX "Source_active_idx" ON "Source"("active");

-- CreateIndex
CREATE INDEX "OrganizationSource_sourceId_idx" ON "OrganizationSource"("sourceId");

-- CreateIndex
CREATE INDEX "OrganizationSource_companyId_idx" ON "OrganizationSource"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSource_companyId_sourceId_key" ON "OrganizationSource"("companyId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSourceAccess_userId_sourceId_key" ON "UserSourceAccess"("userId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSchedule_sourceId_key" ON "SourceSchedule"("sourceId");

-- CreateIndex
CREATE INDEX "SourceSchedule_enabled_nextRunAt_idx" ON "SourceSchedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "CrawlerConfig_sourceId_enabled_idx" ON "CrawlerConfig"("sourceId", "enabled");

-- CreateIndex
CREATE INDEX "CrawlerConfig_createdByUserId_sourceId_idx" ON "CrawlerConfig"("createdByUserId", "sourceId");

-- CreateIndex
CREATE INDEX "CrawlerConfig_enabled_nextRunAt_idx" ON "CrawlerConfig"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "SourceSubscription_sourceId_enabled_idx" ON "SourceSubscription"("sourceId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSubscription_profileId_sourceId_key" ON "SourceSubscription"("profileId", "sourceId");

-- CreateIndex
CREATE INDEX "SourceAudit_sourceId_auditedAt_idx" ON "SourceAudit"("sourceId", "auditedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceHealth_sourceId_key" ON "SourceHealth"("sourceId");

-- CreateIndex
CREATE INDEX "AcquisitionRun_sourceId_status_idx" ON "AcquisitionRun"("sourceId", "status");

-- CreateIndex
CREATE INDEX "AcquisitionRun_scheduleId_status_idx" ON "AcquisitionRun"("scheduleId", "status");

-- CreateIndex
CREATE INDEX "AcquisitionRun_crawlerConfigId_status_idx" ON "AcquisitionRun"("crawlerConfigId", "status");

-- CreateIndex
CREATE INDEX "AcquisitionRun_scheduledFor_idx" ON "AcquisitionRun"("scheduledFor");

-- CreateIndex
CREATE INDEX "AcquisitionRun_status_createdAt_idx" ON "AcquisitionRun"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailIngestion_messageId_key" ON "EmailIngestion"("messageId");

-- CreateIndex
CREATE INDEX "EmailIngestion_userId_receivedAt_idx" ON "EmailIngestion"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "EmailIngestion_sourceId_idx" ON "EmailIngestion"("sourceId");

-- CreateIndex
CREATE INDEX "JobIngestion_status_idx" ON "JobIngestion"("status");

-- CreateIndex
CREATE INDEX "JobIngestion_sourceId_idx" ON "JobIngestion"("sourceId");

-- CreateIndex
CREATE INDEX "JobIngestion_acquisitionRunId_idx" ON "JobIngestion"("acquisitionRunId");

-- CreateIndex
CREATE INDEX "Job_normalizedTitle_idx" ON "Job"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_visibility_createdByUserId_idx" ON "Job"("visibility", "createdByUserId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_freshnessStatus_idx" ON "Job"("freshnessStatus");

-- CreateIndex
CREATE INDEX "Job_firstSeenAt_idx" ON "Job"("firstSeenAt");

-- CreateIndex
CREATE INDEX "Job_fingerprint_idx" ON "Job"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_normalizedUrl_key" ON "JobListing"("normalizedUrl");

-- CreateIndex
CREATE INDEX "JobListing_jobId_idx" ON "JobListing"("jobId");

-- CreateIndex
CREATE INDEX "JobListing_sourceId_postedAt_idx" ON "JobListing"("sourceId", "postedAt");

-- CreateIndex
CREATE INDEX "JobListing_acquisitionMethod_firstSeenAt_idx" ON "JobListing"("acquisitionMethod", "firstSeenAt");

-- CreateIndex
CREATE INDEX "JobListing_status_idx" ON "JobListing"("status");

-- CreateIndex
CREATE INDEX "JobListing_requisitionId_idx" ON "JobListing"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_sourceId_listingKey_key" ON "JobListing"("sourceId", "listingKey");

-- CreateIndex
CREATE INDEX "JobListingRevision_listingId_detectedAt_idx" ON "JobListingRevision"("listingId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobListingMatch_listingId_key" ON "JobListingMatch"("listingId");

-- CreateIndex
CREATE INDEX "JobListingMatch_jobId_idx" ON "JobListingMatch"("jobId");

-- CreateIndex
CREATE INDEX "JobProfileMatch_score_idx" ON "JobProfileMatch"("score");

-- CreateIndex
CREATE UNIQUE INDEX "JobProfileMatch_profileId_jobId_key" ON "JobProfileMatch"("profileId", "jobId");

-- CreateIndex
CREATE INDEX "UserJobState_preferredCvVersionId_idx" ON "UserJobState"("preferredCvVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserJobState_userId_jobId_key" ON "UserJobState"("userId", "jobId");

-- CreateIndex
CREATE INDEX "Application_userId_stage_idx" ON "Application"("userId", "stage");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_foundSourceId_idx" ON "Application"("foundSourceId");

-- CreateIndex
CREATE INDEX "Application_appliedSourceId_idx" ON "Application"("appliedSourceId");

-- CreateIndex
CREATE INDEX "Application_cvVersionId_idx" ON "Application"("cvVersionId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_occurredAt_idx" ON "ApplicationEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "JobNote_userId_jobId_idx" ON "JobNote"("userId", "jobId");

-- CreateIndex
CREATE INDEX "RiskReport_sourceId_idx" ON "RiskReport"("sourceId");

-- CreateIndex
CREATE INDEX "RiskReport_companyId_idx" ON "RiskReport"("companyId");

-- CreateIndex
CREATE INDEX "RiskReport_jobId_idx" ON "RiskReport"("jobId");

-- CreateIndex
CREATE INDEX "RiskReport_level_idx" ON "RiskReport"("level");

-- CreateIndex
CREATE INDEX "JobStatusEvent_jobId_occurredAt_idx" ON "JobStatusEvent"("jobId", "occurredAt");

-- CreateIndex
CREATE INDEX "EvidenceEntry_userId_type_idx" ON "EvidenceEntry"("userId", "type");

-- CreateIndex
CREATE INDEX "JobSnapshot_jobId_capturedAt_idx" ON "JobSnapshot"("jobId", "capturedAt");

-- CreateIndex
CREATE INDEX "JobSnapshot_applicationPackId_idx" ON "JobSnapshot"("applicationPackId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationPack_applicationId_key" ON "ApplicationPack"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationPack_userId_status_idx" ON "ApplicationPack"("userId", "status");

-- CreateIndex
CREATE INDEX "CoverLetter_userId_jobId_idx" ON "CoverLetter"("userId", "jobId");

-- CreateIndex
CREATE INDEX "CoverLetter_applicationId_idx" ON "CoverLetter"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewWorkspace_applicationId_key" ON "InterviewWorkspace"("applicationId");

-- CreateIndex
CREATE INDEX "Contact_userId_organization_idx" ON "Contact"("userId", "organization");

-- CreateIndex
CREATE INDEX "Contact_userId_email_idx" ON "Contact"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationContact_applicationId_contactId_key" ON "ApplicationContact"("applicationId", "contactId");

-- CreateIndex
CREATE INDEX "FollowUpSuggestion_userId_state_dueAt_idx" ON "FollowUpSuggestion"("userId", "state", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpSuggestion_applicationId_idx" ON "FollowUpSuggestion"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_applicationId_key" ON "Offer"("applicationId");

-- CreateIndex
CREATE INDEX "Offer_userId_status_idx" ON "Offer"("userId", "status");

-- CreateIndex
CREATE INDEX "SearchCampaign_userId_status_idx" ON "SearchCampaign"("userId", "status");

-- CreateIndex
CREATE INDEX "JobShare_userId_createdAt_idx" ON "JobShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SmartNotification_userId_state_createdAt_idx" ON "SmartNotification"("userId", "state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmartNotification_userId_fingerprint_key" ON "SmartNotification"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "JobPriority_userId_bucket_idx" ON "JobPriority"("userId", "bucket");

-- CreateIndex
CREATE INDEX "JobPriority_profileId_score_idx" ON "JobPriority"("profileId", "score");

-- CreateIndex
CREATE INDEX "JobPriority_jobId_idx" ON "JobPriority"("jobId");

-- CreateIndex
CREATE INDEX "SourceBatch_userId_idx" ON "SourceBatch"("userId");

-- CreateIndex
CREATE INDEX "SourceBatchItem_sourceId_idx" ON "SourceBatchItem"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceBatchItem_batchId_sourceId_key" ON "SourceBatchItem"("batchId", "sourceId");

-- CreateIndex
CREATE INDEX "Cv_userId_archived_idx" ON "Cv"("userId", "archived");

-- CreateIndex
CREATE INDEX "CvVersion_cvId_createdAt_idx" ON "CvVersion"("cvId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CvVersion_cvId_versionNumber_key" ON "CvVersion"("cvId", "versionNumber");

-- CreateIndex
CREATE INDEX "CvProfileLink_profileId_isDefault_idx" ON "CvProfileLink"("profileId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "CvProfileLink_cvId_profileId_key" ON "CvProfileLink"("cvId", "profileId");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_kind_idx" ON "JobRequirement"("jobId", "kind");

-- CreateIndex
CREATE INDEX "JobRequirement_normalizedKey_idx" ON "JobRequirement"("normalizedKey");

-- CreateIndex
CREATE INDEX "JobCvMatch_jobId_updatedAt_idx" ON "JobCvMatch"("jobId", "updatedAt");

-- CreateIndex
CREATE INDEX "JobCvMatch_cvVersionId_idx" ON "JobCvMatch"("cvVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCvMatch_userId_jobId_cvVersionId_key" ON "JobCvMatch"("userId", "jobId", "cvVersionId");

-- CreateIndex
CREATE INDEX "JobCvMatchItem_matchId_status_idx" ON "JobCvMatchItem"("matchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CvTailoringSession_createdVersionId_key" ON "CvTailoringSession"("createdVersionId");

-- CreateIndex
CREATE INDEX "CvTailoringSession_userId_updatedAt_idx" ON "CvTailoringSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CvTailoringSession_jobId_idx" ON "CvTailoringSession"("jobId");

-- CreateIndex
CREATE INDEX "CvTailoringSuggestion_sessionId_status_idx" ON "CvTailoringSuggestion"("sessionId", "status");

-- CreateIndex
CREATE INDEX "AiUsage_task_createdAt_idx" ON "AiUsage"("task", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "_ProfileCategories_B_index" ON "_ProfileCategories"("B");

-- CreateIndex
CREATE INDEX "_JobTags_B_index" ON "_JobTags"("B");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserCompanionToken" ADD CONSTRAINT "BrowserCompanionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchProfile" ADD CONSTRAINT "SearchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCategory" ADD CONSTRAINT "JobCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSource" ADD CONSTRAINT "OrganizationSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSource" ADD CONSTRAINT "OrganizationSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSourceAccess" ADD CONSTRAINT "UserSourceAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSourceAccess" ADD CONSTRAINT "UserSourceAccess_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSchedule" ADD CONSTRAINT "SourceSchedule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlerConfig" ADD CONSTRAINT "CrawlerConfig_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlerConfig" ADD CONSTRAINT "CrawlerConfig_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSubscription" ADD CONSTRAINT "SourceSubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSubscription" ADD CONSTRAINT "SourceSubscription_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceAudit" ADD CONSTRAINT "SourceAudit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceHealth" ADD CONSTRAINT "SourceHealth_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionRun" ADD CONSTRAINT "AcquisitionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionRun" ADD CONSTRAINT "AcquisitionRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SourceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionRun" ADD CONSTRAINT "AcquisitionRun_crawlerConfigId_fkey" FOREIGN KEY ("crawlerConfigId") REFERENCES "CrawlerConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailIngestion" ADD CONSTRAINT "EmailIngestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailIngestion" ADD CONSTRAINT "EmailIngestion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIngestion" ADD CONSTRAINT "JobIngestion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIngestion" ADD CONSTRAINT "JobIngestion_acquisitionRunId_fkey" FOREIGN KEY ("acquisitionRunId") REFERENCES "AcquisitionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIngestion" ADD CONSTRAINT "JobIngestion_emailIngestionId_fkey" FOREIGN KEY ("emailIngestionId") REFERENCES "EmailIngestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_ingestionId_fkey" FOREIGN KEY ("ingestionId") REFERENCES "JobIngestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_acquisitionRunId_fkey" FOREIGN KEY ("acquisitionRunId") REFERENCES "AcquisitionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListingRevision" ADD CONSTRAINT "JobListingRevision_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListingMatch" ADD CONSTRAINT "JobListingMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListingMatch" ADD CONSTRAINT "JobListingMatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfileMatch" ADD CONSTRAINT "JobProfileMatch_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProfileMatch" ADD CONSTRAINT "JobProfileMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobState" ADD CONSTRAINT "UserJobState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobState" ADD CONSTRAINT "UserJobState_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobState" ADD CONSTRAINT "UserJobState_preferredCvVersionId_fkey" FOREIGN KEY ("preferredCvVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_searchProfileId_fkey" FOREIGN KEY ("searchProfileId") REFERENCES "SearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_sourceListingId_fkey" FOREIGN KEY ("sourceListingId") REFERENCES "JobListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_foundSourceId_fkey" FOREIGN KEY ("foundSourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_appliedSourceId_fkey" FOREIGN KEY ("appliedSourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cvVersionId_fkey" FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskReport" ADD CONSTRAINT "RiskReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskReport" ADD CONSTRAINT "RiskReport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskReport" ADD CONSTRAINT "RiskReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskReport" ADD CONSTRAINT "RiskReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusEvent" ADD CONSTRAINT "JobStatusEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceEntry" ADD CONSTRAINT "EvidenceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSnapshot" ADD CONSTRAINT "JobSnapshot_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSnapshot" ADD CONSTRAINT "JobSnapshot_applicationPackId_fkey" FOREIGN KEY ("applicationPackId") REFERENCES "ApplicationPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPack" ADD CONSTRAINT "ApplicationPack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPack" ADD CONSTRAINT "ApplicationPack_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewWorkspace" ADD CONSTRAINT "InterviewWorkspace_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSuggestion" ADD CONSTRAINT "FollowUpSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSuggestion" ADD CONSTRAINT "FollowUpSuggestion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchCampaign" ADD CONSTRAINT "SearchCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchCampaign" ADD CONSTRAINT "SearchCampaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobShare" ADD CONSTRAINT "JobShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartNotification" ADD CONSTRAINT "SmartNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPriority" ADD CONSTRAINT "JobPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPriority" ADD CONSTRAINT "JobPriority_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPriority" ADD CONSTRAINT "JobPriority_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceBatch" ADD CONSTRAINT "SourceBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceBatchItem" ADD CONSTRAINT "SourceBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SourceBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceBatchItem" ADD CONSTRAINT "SourceBatchItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cv" ADD CONSTRAINT "Cv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvVersion" ADD CONSTRAINT "CvVersion_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvProfileLink" ADD CONSTRAINT "CvProfileLink_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvProfileLink" ADD CONSTRAINT "CvProfileLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCvMatch" ADD CONSTRAINT "JobCvMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCvMatch" ADD CONSTRAINT "JobCvMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCvMatch" ADD CONSTRAINT "JobCvMatch_cvVersionId_fkey" FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCvMatchItem" ADD CONSTRAINT "JobCvMatchItem_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "JobCvMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCvMatchItem" ADD CONSTRAINT "JobCvMatchItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "JobRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSession" ADD CONSTRAINT "CvTailoringSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSession" ADD CONSTRAINT "CvTailoringSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSession" ADD CONSTRAINT "CvTailoringSession_baseCvVersionId_fkey" FOREIGN KEY ("baseCvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSession" ADD CONSTRAINT "CvTailoringSession_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "JobCvMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSession" ADD CONSTRAINT "CvTailoringSession_createdVersionId_fkey" FOREIGN KEY ("createdVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvTailoringSuggestion" ADD CONSTRAINT "CvTailoringSuggestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CvTailoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileCategories" ADD CONSTRAINT "_ProfileCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "JobCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileCategories" ADD CONSTRAINT "_ProfileCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "SearchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobTags" ADD CONSTRAINT "_JobTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobTags" ADD CONSTRAINT "_JobTags_B_fkey" FOREIGN KEY ("B") REFERENCES "JobTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
