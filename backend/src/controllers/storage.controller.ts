import type { Request, Response } from 'express';
import { sessionContext } from '../middleware/session.middleware';
import type { StorageService } from '../services/storage.service';

export function createStorageController(storage: StorageService) {
  return {
    async overview(_req: Request, res: Response) {
      res.json(await storage.overview(sessionContext(res).userId));
    },
  };
}
