import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { APIError } from "@/utils/errors.js";

/**
 * Zod validation middleware for Express routes
 */
export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return next(new APIError(400, "Validation failed", true, "VALIDATION_ERROR"));
    }
    return next(error);
  }
};
