import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(" [Error Handler Middleware]:", err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || "Une erreur interne est survenue.";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
  });
}
