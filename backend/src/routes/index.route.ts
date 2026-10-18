import { Router } from 'express';
import { hello } from '../controllers/index.controller';
import { logRequest } from '../middleware/index.middleware';

const router = Router();

router.get('/hello', logRequest, hello);

export default router;
