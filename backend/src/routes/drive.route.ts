import { Router } from "express";
import type { AuthConfig } from "../config/auth.config";
import { createDriveController } from "../controllers/drive.controller";
import type { AuthStore } from "../db/auth.repository";
import type { DriveRepository } from "../db/drive.repository";
import {
  authResponseHeaders,
  createLoginRateLimit,
} from "../middleware/auth.middleware";
import { createSessionMiddleware } from "../middleware/session.middleware";
import type { GoogleProvider } from "../services/google.service";
import type { TokenEncryption } from "../services/token-encryption.service";
import type { DriveAccess } from "../services/drive-access.service";
import { createStorageController } from "../controllers/storage.controller";
import type { StorageService } from "../services/storage.service";
import type { FileBrowser } from "../services/file-browser.service";
import { createFilesController } from "../controllers/files.controller";

export interface DriveDependencies {
  repository: DriveRepository;
  google: GoogleProvider;
  encryption: TokenEncryption;
  access: DriveAccess;
  storage: StorageService;
  files: FileBrowser;
}
export function createDriveRouter(
  auth: AuthStore,
  dependencies: DriveDependencies,
  config: AuthConfig,
) {
  const router = Router();
  const { requireSession, requireCsrf } = createSessionMiddleware(auth, config);
  const controller = createDriveController(
    dependencies.repository,
    dependencies.google,
    dependencies.encryption,
    config,
    dependencies.access,
  );
  const rateLimit = createLoginRateLimit();
  router.use(authResponseHeaders, requireSession);
  router.get("/accounts", controller.list);
  router.get("/files", createFilesController(dependencies.files).list);
  router.get(
    "/storage",
    createStorageController(dependencies.storage).overview,
  );
  router.post("/accounts/connect", requireCsrf, rateLimit, controller.connect);
  router.post(
    "/accounts/:id/reconnect",
    requireCsrf,
    rateLimit,
    controller.connect,
  );
  router.get("/oauth/callback", rateLimit, controller.callback);
  router.delete("/accounts/:id", requireCsrf, controller.disconnect);
  return router;
}
