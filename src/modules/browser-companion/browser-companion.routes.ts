import { Router } from 'express';

import { requireUser } from '../auth/auth.middleware.js';
import { browserCompanionController } from './browser-companion.controller.js';
import { requireBrowserCompanion } from './browser-companion.middleware.js';

export const browserCompanionRouter = Router();

// Token management happens inside the signed-in web application.
browserCompanionRouter.get('/tokens', requireUser, browserCompanionController.listTokens);
browserCompanionRouter.post('/tokens', requireUser, browserCompanionController.createToken);
browserCompanionRouter.delete('/tokens/:tokenId', requireUser, browserCompanionController.revokeToken);

// Capture requests originate from the Chrome/Firefox extension and use a
// separately revocable browser companion token.
browserCompanionRouter.get('/cvs', requireBrowserCompanion, browserCompanionController.listCvs);
browserCompanionRouter.get('/sources', requireBrowserCompanion, browserCompanionController.listSources);
browserCompanionRouter.post('/sources', requireBrowserCompanion, browserCompanionController.createSource);
browserCompanionRouter.post('/analyze-page', requireBrowserCompanion, browserCompanionController.analyzePage);
browserCompanionRouter.post('/compare-page', requireBrowserCompanion, browserCompanionController.comparePage);
browserCompanionRouter.get('/cv-preview-source/:versionId', requireBrowserCompanion, browserCompanionController.cvPreviewSource);
browserCompanionRouter.post('/build-cv-preview', requireBrowserCompanion, browserCompanionController.buildCvPreview);
browserCompanionRouter.post('/render-cv-preview', requireBrowserCompanion, browserCompanionController.renderCvPreview);
browserCompanionRouter.post('/save-cv-preview', requireBrowserCompanion, browserCompanionController.saveCvPreview);
browserCompanionRouter.get('/download-cv-preview/:versionId', requireBrowserCompanion, browserCompanionController.downloadCvPreview);
browserCompanionRouter.post('/prepare-cv', requireBrowserCompanion, browserCompanionController.prepareCv);
browserCompanionRouter.get('/context', requireBrowserCompanion, browserCompanionController.context);
browserCompanionRouter.post('/capture', requireBrowserCompanion, browserCompanionController.capture);
