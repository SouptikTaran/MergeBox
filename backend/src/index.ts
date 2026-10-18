
import './config/env';
import express from 'express';
import type { Request, Response } from 'express';
import router from './routes/index.route';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(router);

// Health route
app.get('/', (req: Request, res: Response) => {
  res.send('Backend is running');
});

app.listen(PORT, () => {
  console.log(`Backend Started: http://localhost:${PORT}`);
});
