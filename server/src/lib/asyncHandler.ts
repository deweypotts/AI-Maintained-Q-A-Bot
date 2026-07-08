import { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 doesn't catch rejected promises from async route handlers — an
// unhandled rejection anywhere (a bad query param, a DB hiccup, a Claude API
// error) crashes the entire process instead of just failing that request.
// Wrapping every handler in this forwards the error to Express's error
// middleware instead.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
