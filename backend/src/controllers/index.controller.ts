import type { Request, Response } from 'express';

export const hello = (_req: Request, res: Response) => {
  res.json({ message: 'Hello World!' });
};
