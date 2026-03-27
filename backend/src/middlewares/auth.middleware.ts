import { NextFunction, Request, Response } from "express";
import { APIError } from "@/utils/errors.js";

export type JwtPayload = {
  userId: string;
  role?: string;
  [key: string]: any;
};

import { auth } from "@/config/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return next(APIError.unauthorized("Authentication required"));
    }

    (req as any).user = session.user;
    next();
  } catch (error) {
    return next(APIError.unauthorized("Invalid or expired session"));
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || !user.role || !allowedRoles.includes(user.role)) {
      return next(APIError.forbidden("Insufficient permissions"));
    }
    next();
  };
};
