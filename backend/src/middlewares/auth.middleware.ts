import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { APIError } from "@/utils/errors.js";
import envVars from "@/config/envVars.js";

export type JwtPayload = {
  userId: string;
  role?: string;
  [key: string]: any;
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.cookies?.JWT_SESSION;

  if (!token) {
    return next(APIError.unauthorized("Authentication required"));
  }

  try {
    if (!envVars.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, envVars.JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;

    next();
  } catch (error) {
    return next(APIError.unauthorized("Invalid or expired token"));
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || !user.role || !allowedRoles.includes(user.role)) {
      return next(APIError.forbidden("Insufficient permissions"));
    }
    next();
  };
};
