import type { ErrorRequestHandler } from 'express';

export const handleError: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
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
