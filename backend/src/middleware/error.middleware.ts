import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/http-error.util';

export const handleError: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res
      .set('Cache-Control', 'no-store')
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  // OAuth and SQL errors can contain credentials, so do not log the raw error.
  const type = (error as { type?: string } | null)?.type;
  const invalidBody =
    type === 'entity.parse.failed' || type === 'entity.too.large';

  res
    .set('Cache-Control', 'no-store')
    .status(invalidBody ? 400 : 503)
    .json({
      error: {
        code: invalidBody ? 'invalid_body' : 'service_unavailable',
        message: invalidBody
          ? 'Invalid request body.'
          : 'Service temporarily unavailable. Try again.',
      },
    });
};
