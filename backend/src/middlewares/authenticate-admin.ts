import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { getCollections, type Address, type AdminRole } from "../database";

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-admin-secret";

type AdminTokenPayload = {
  adminId: string;
  complexId: string;
  role: AdminRole;
};

export type AuthenticatedAdminRequest = Request & {
  admin?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: AdminRole;
    complexId: string;
  };

  adminComplex?: {
    id: string;
    slug: string;
    name: string;
    description: string;
    location: string;
    phone: string | null;
    whatsapp: string | null;
    address: Address;
    isActive: boolean;
  };
};

export async function authenticateAdmin(
  request: AuthenticatedAdminRequest,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return response.status(401).json({
      message: "Token administrativo não informado.",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Token administrativo inválido.",
    });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;

    if (
      !decoded.adminId ||
      !decoded.complexId ||
      decoded.role !== "COMPLEX_ADMIN"
    ) {
      return response.status(401).json({
        message: "Token administrativo inválido.",
      });
    }

    const { adminUsers, complexes } = await getCollections();

    /*
     * Não confiamos apenas nos dados contidos no token.
     * Consultamos novamente o administrador no banco.
     */
    const admin = await adminUsers.findOne({
      id: decoded.adminId,
    });

    if (!admin) {
      return response.status(401).json({
        message: "Administrador não encontrado.",
      });
    }

    if (!admin.isActive) {
      return response.status(403).json({
        message: "Esta conta administrativa está desativada.",
      });
    }

    if (admin.role !== "COMPLEX_ADMIN") {
      return response.status(403).json({
        message: "Usuário sem permissão administrativa.",
      });
    }

    /*
     * O complexId válido vem do documento atual do administrador,
     * e não de parâmetros enviados pelo frontend.
     */
    const complex = await complexes.findOne({
      id: admin.complexId,
    });

    if (!complex) {
      return response.status(403).json({
        message: "Complexo vinculado ao administrador não encontrado.",
      });
    }

    if (!complex.isActive) {
      return response.status(403).json({
        message: "O complexo vinculado está desativado.",
      });
    }

    request.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      complexId: admin.complexId,
    };

    request.adminComplex = {
      id: complex.id,
      slug: complex.slug,
      name: complex.name,
      description: complex.description,
      location: complex.location,
      phone: complex.phone,
      whatsapp: complex.whatsapp,
      address: complex.address,
      isActive: complex.isActive,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({
        message: "Token administrativo expirado.",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return response.status(401).json({
        message: "Token administrativo inválido.",
      });
    }

    console.error("Erro ao autenticar administrador:", error);

    return response.status(500).json({
      message: "Erro interno ao autenticar administrador.",
    });
  }
}
