CREATE TABLE "BrowserPageAnalysisCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserPageAnalysisCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserPageAnalysisCache_cacheKey_key" ON "BrowserPageAnalysisCache"("cacheKey");
CREATE INDEX "BrowserPageAnalysisCache_pageUrl_idx" ON "BrowserPageAnalysisCache"("pageUrl");
