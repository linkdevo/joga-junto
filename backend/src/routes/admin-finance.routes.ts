import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getCollections, type BarProduct, type FinanceCost } from "../database";

import {
  authenticateAdmin,
  type AuthenticatedAdminRequest,
} from "../middlewares/authenticate-admin";

import { getRouteParam } from "../utils/route-params";
import {
  getCurrentMonth,
  getMonthRange,
  isValidMonth,
} from "../utils/month";

const router = Router();

const BAR_PRODUCT_CATEGORIES = [
  "Bebidas",
  "Alimentos",
  "Acessórios",
  "Outros",
] as const;

const PIX_KEY_TYPES = ["EMAIL", "PHONE", "CPF_CNPJ", "RANDOM"] as const;

/**
 * ============================================================
 * HELPERS DE CÁLCULO
 * ============================================================
 */

/**
 * Soma o que o complexo efetivamente recebe (quadra + churrasco,
 * já descontada a taxa da plataforma) de jogadores com pagamento
 * confirmado, opcionalmente restrito a um intervalo de datas de
 * pagamento (`paidAt`).
 */
async function sumPaidBookingRevenue(
  complexId: string,
  range?: { from: Date; to: Date },
): Promise<number> {
  const { bookings, bookingPlayers } = await getCollections();

  const bookingDocuments = await bookings
    .find({
      complexId,
    })
    .project({
      id: 1,
    })
    .toArray();

  const bookingIds = bookingDocuments.map((booking) => booking.id as string);

  if (bookingIds.length === 0) {
    return 0;
  }

  const players = await bookingPlayers
    .find({
      bookingId: {
        $in: bookingIds,
      },

      status: "PAID",

      ...(range
        ? {
            paidAt: {
              $gte: range.from,
              $lt: range.to,
            },
          }
        : {}),
    })
    .toArray();

  return players.reduce((sum, player) => {
    return (
      sum + (player.courtShareInCents ?? 0) + (player.leisureShareInCents ?? 0)
    );
  }, 0);
}

/**
 * Valores já calculados (grupo completo), mas ainda não pagos.
 */
async function sumFutureReceivables(complexId: string): Promise<number> {
  const { bookings, bookingPlayers } = await getCollections();

  const bookingDocuments = await bookings
    .find({
      complexId,
    })
    .project({
      id: 1,
    })
    .toArray();

  const bookingIds = bookingDocuments.map((booking) => booking.id as string);

  if (bookingIds.length === 0) {
    return 0;
  }

  const players = await bookingPlayers
    .find({
      bookingId: {
        $in: bookingIds,
      },

      status: "WAITING_PAYMENT",
    })
    .toArray();

  return players.reduce((sum, player) => {
    return (
      sum + (player.courtShareInCents ?? 0) + (player.leisureShareInCents ?? 0)
    );
  }, 0);
}

async function sumCompletedPayouts(complexId: string): Promise<number> {
  const { payoutRequests } = await getCollections();

  const payouts = await payoutRequests
    .find({
      complexId,
    })
    .toArray();

  return payouts.reduce((sum, payout) => sum + payout.amountInCents, 0);
}

/**
 * ============================================================
 * ESTOQUE DO BAR
 * ============================================================
 */

function formatBarProduct(product: BarProduct) {
  return {
    id: product.id,
    complexId: product.complexId,
    name: product.name,
    category: product.category,
    priceInCents: product.priceInCents,
    currentStock: product.currentStock,
    minimumStock: product.minimumStock,
    isBelowMinimum: product.currentStock < product.minimumStock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

router.get(
  "/admin/bar-products",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const { barProducts } = await getCollections();

      const products = await barProducts
        .find({
          complexId: request.admin.complexId,
        })
        .sort({
          name: 1,
        })
        .toArray();

      return response.status(200).json({
        products: products.map(formatBarProduct),
      });
    } catch (error) {
      console.error("Erro ao buscar produtos do bar:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar os produtos do bar.",
      });
    }
  },
);

const barProductSchema = z.object({
  name: z.string().trim().min(2, {
    message: "Informe o nome do produto.",
  }),

  category: z.enum(BAR_PRODUCT_CATEGORIES, {
    message: "Selecione uma categoria válida.",
  }),

  priceInCents: z.number().int().nonnegative({
    message: "O preço deve ser um número inteiro em centavos.",
  }),

  currentStock: z.number().int().nonnegative({
    message: "O estoque inicial deve ser zero ou maior.",
  }),

  minimumStock: z.number().int().nonnegative({
    message: "O estoque mínimo deve ser zero ou maior.",
  }),
});

router.post(
  "/admin/bar-products",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = barProductSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para cadastrar o produto.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { barProducts } = await getCollections();

      const now = new Date();

      const product: BarProduct = {
        id: randomUUID(),
        complexId: request.admin.complexId,

        name: parsedBody.data.name,
        category: parsedBody.data.category,
        priceInCents: parsedBody.data.priceInCents,

        currentStock: parsedBody.data.currentStock,
        minimumStock: parsedBody.data.minimumStock,

        createdAt: now,
        updatedAt: now,
      };

      await barProducts.insertOne(product);

      return response.status(201).json({
        message: "Produto cadastrado com sucesso.",
        product: formatBarProduct(product),
      });
    } catch (error) {
      console.error("Erro ao cadastrar produto do bar:", error);

      return response.status(500).json({
        message: "Erro interno ao cadastrar o produto.",
      });
    }
  },
);

const updateBarProductSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    category: z.enum(BAR_PRODUCT_CATEGORIES).optional(),
    priceInCents: z.number().int().nonnegative().optional(),
    minimumStock: z.number().int().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualização.",
  });

router.patch(
  "/admin/bar-products/:productId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const productId = getRouteParam(request.params.productId);

    if (!productId) {
      return response.status(400).json({
        message: "O ID do produto não foi informado.",
      });
    }

    const parsedBody = updateBarProductSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para atualizar o produto.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;

    try {
      const { barProducts } = await getCollections();

      const updatedProduct = await barProducts.findOneAndUpdate(
        {
          id: productId,
          complexId: request.admin.complexId,
        },
        {
          $set: {
            ...(data.name !== undefined
              ? {
                  name: data.name,
                }
              : {}),

            ...(data.category !== undefined
              ? {
                  category: data.category,
                }
              : {}),

            ...(data.priceInCents !== undefined
              ? {
                  priceInCents: data.priceInCents,
                }
              : {}),

            ...(data.minimumStock !== undefined
              ? {
                  minimumStock: data.minimumStock,
                }
              : {}),

            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedProduct) {
        return response.status(404).json({
          message: "Produto não encontrado.",
        });
      }

      return response.status(200).json({
        message: "Produto atualizado com sucesso.",
        product: formatBarProduct(updatedProduct),
      });
    } catch (error) {
      console.error("Erro ao atualizar produto do bar:", error);

      return response.status(500).json({
        message: "Erro interno ao atualizar o produto.",
      });
    }
  },
);

const adjustStockSchema = z.object({
  delta: z.number().int().refine((value) => value !== 0, {
    message: "Informe uma variação de estoque diferente de zero.",
  }),
});

router.patch(
  "/admin/bar-products/:productId/stock",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const productId = getRouteParam(request.params.productId);

    if (!productId) {
      return response.status(400).json({
        message: "O ID do produto não foi informado.",
      });
    }

    const parsedBody = adjustStockSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Informe uma variação de estoque válida.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { barProducts } = await getCollections();

      const existingProduct = await barProducts.findOne({
        id: productId,
        complexId: request.admin.complexId,
      });

      if (!existingProduct) {
        return response.status(404).json({
          message: "Produto não encontrado.",
        });
      }

      const nextStock = existingProduct.currentStock + parsedBody.data.delta;

      if (nextStock < 0) {
        return response.status(400).json({
          message: "O estoque não pode ficar negativo.",
        });
      }

      const updatedProduct = await barProducts.findOneAndUpdate(
        {
          id: productId,
          complexId: request.admin.complexId,
        },
        {
          $set: {
            currentStock: nextStock,
            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedProduct) {
        return response.status(404).json({
          message: "Produto não encontrado.",
        });
      }

      return response.status(200).json({
        message: "Estoque atualizado com sucesso.",
        product: formatBarProduct(updatedProduct),
      });
    } catch (error) {
      console.error("Erro ao ajustar estoque do produto:", error);

      return response.status(500).json({
        message: "Erro interno ao ajustar o estoque.",
      });
    }
  },
);

router.delete(
  "/admin/bar-products/:productId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const productId = getRouteParam(request.params.productId);

    if (!productId) {
      return response.status(400).json({
        message: "O ID do produto não foi informado.",
      });
    }

    try {
      const { barProducts } = await getCollections();

      const deleteResult = await barProducts.deleteOne({
        id: productId,
        complexId: request.admin.complexId,
      });

      if (deleteResult.deletedCount === 0) {
        return response.status(404).json({
          message: "Produto não encontrado.",
        });
      }

      return response.status(200).json({
        message: "Produto removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover produto do bar:", error);

      return response.status(500).json({
        message: "Erro interno ao remover o produto.",
      });
    }
  },
);

/**
 * ============================================================
 * FINANCEIRO: CUSTOS FIXOS E VARIÁVEIS
 * ============================================================
 */

router.get(
  "/admin/finance/costs",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const month = isValidMonth(request.query.month)
      ? request.query.month
      : getCurrentMonth();

    try {
      const { financeCosts } = await getCollections();
      const { end } = getMonthRange(month);

      const costs = await financeCosts
        .find({
          complexId: request.admin.complexId,

          $or: [
            {
              type: "FIXED",
              createdAt: {
                $lt: end,
              },
            },
            {
              type: "VARIABLE",
              month,
            },
          ],
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

      return response.status(200).json({
        month,
        costs,
      });
    } catch (error) {
      console.error("Erro ao buscar custos:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar os custos.",
      });
    }
  },
);

const createCostSchema = z
  .object({
    description: z.string().trim().min(2, {
      message: "Informe a descrição do custo.",
    }),

    type: z.enum(["FIXED", "VARIABLE"], {
      message: "Selecione o tipo do custo.",
    }),

    amountInCents: z.number().int().positive({
      message: "O valor deve ser um número inteiro positivo em centavos.",
    }),

    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
        message: "O mês deve estar no formato YYYY-MM.",
      })
      .optional(),
  })
  .refine(
    (data) => {
      return data.type !== "VARIABLE" || Boolean(data.month);
    },
    {
      message: "Informe o mês do custo variável.",
      path: ["month"],
    },
  );

router.post(
  "/admin/finance/costs",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = createCostSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para cadastrar o custo.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = parsedBody.data;

    try {
      const { financeCosts } = await getCollections();

      const now = new Date();

      const cost: FinanceCost = {
        id: randomUUID(),
        complexId: request.admin.complexId,

        description: data.description,
        type: data.type,
        amountInCents: data.amountInCents,

        month: data.type === "VARIABLE" ? (data.month ?? null) : null,

        createdAt: now,
        updatedAt: now,
      };

      await financeCosts.insertOne(cost);

      return response.status(201).json({
        message: "Despesa cadastrada com sucesso.",
        cost,
      });
    } catch (error) {
      console.error("Erro ao cadastrar custo:", error);

      return response.status(500).json({
        message: "Erro interno ao cadastrar o custo.",
      });
    }
  },
);

router.delete(
  "/admin/finance/costs/:costId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const costId = getRouteParam(request.params.costId);

    if (!costId) {
      return response.status(400).json({
        message: "O ID do custo não foi informado.",
      });
    }

    try {
      const { financeCosts } = await getCollections();

      const deleteResult = await financeCosts.deleteOne({
        id: costId,
        complexId: request.admin.complexId,
      });

      if (deleteResult.deletedCount === 0) {
        return response.status(404).json({
          message: "Custo não encontrado.",
        });
      }

      return response.status(200).json({
        message: "Custo removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover custo:", error);

      return response.status(500).json({
        message: "Erro interno ao remover o custo.",
      });
    }
  },
);

/**
 * ============================================================
 * FINANCEIRO: CONTRATOS E RECEITAS FIXAS
 * ============================================================
 */

router.get(
  "/admin/finance/contracts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const { financeContracts } = await getCollections();

      const contracts = await financeContracts
        .find({
          complexId: request.admin.complexId,
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

      return response.status(200).json({
        contracts,
      });
    } catch (error) {
      console.error("Erro ao buscar contratos:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar os contratos.",
      });
    }
  },
);

const createContractSchema = z.object({
  description: z.string().trim().min(2, {
    message: "Informe a descrição do contrato.",
  }),

  category: z.string().trim().min(2, {
    message: "Informe a categoria do contrato.",
  }),

  amountInCents: z.number().int().positive({
    message: "O valor deve ser um número inteiro positivo em centavos.",
  }),
});

router.post(
  "/admin/finance/contracts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = createContractSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para cadastrar o contrato.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { financeContracts } = await getCollections();

      const now = new Date();

      const contract = {
        id: randomUUID(),
        complexId: request.admin.complexId,

        description: parsedBody.data.description,
        category: parsedBody.data.category,
        amountInCents: parsedBody.data.amountInCents,

        createdAt: now,
        updatedAt: now,
      };

      await financeContracts.insertOne(contract);

      return response.status(201).json({
        message: "Contrato cadastrado com sucesso.",
        contract,
      });
    } catch (error) {
      console.error("Erro ao cadastrar contrato:", error);

      return response.status(500).json({
        message: "Erro interno ao cadastrar o contrato.",
      });
    }
  },
);

router.delete(
  "/admin/finance/contracts/:contractId",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const contractId = getRouteParam(request.params.contractId);

    if (!contractId) {
      return response.status(400).json({
        message: "O ID do contrato não foi informado.",
      });
    }

    try {
      const { financeContracts } = await getCollections();

      const deleteResult = await financeContracts.deleteOne({
        id: contractId,
        complexId: request.admin.complexId,
      });

      if (deleteResult.deletedCount === 0) {
        return response.status(404).json({
          message: "Contrato não encontrado.",
        });
      }

      return response.status(200).json({
        message: "Contrato removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover contrato:", error);

      return response.status(500).json({
        message: "Erro interno ao remover o contrato.",
      });
    }
  },
);

/**
 * ============================================================
 * FINANCEIRO: RESUMO DO MÊS
 * ============================================================
 */

router.get(
  "/admin/finance/summary",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const month = isValidMonth(request.query.month)
      ? request.query.month
      : getCurrentMonth();

    try {
      const complexId = request.admin.complexId;
      const { financeCosts, financeContracts } = await getCollections();
      const { start, end } = getMonthRange(month);

      const courtRevenueInCents = await sumPaidBookingRevenue(complexId, {
        from: start,
        to: end,
      });

      /*
       * Ainda não existe um fluxo de vendas do bar (o estoque,
       * por enquanto, só é ajustado manualmente pelo
       * administrador). Este valor fica zerado até essa
       * funcionalidade existir.
       */
      const barSalesInCents = 0;

      /*
       * Assim como os custos fixos, um contrato só conta a
       * partir do mês em que foi cadastrado — senão ele
       * apareceria também em meses anteriores à sua criação.
       */
      const contracts = await financeContracts
        .find({
          complexId,
          createdAt: {
            $lt: end,
          },
        })
        .toArray();

      const fixedContractsRevenueInCents = contracts.reduce(
        (sum, contract) => sum + contract.amountInCents,
        0,
      );

      const totalRevenueInCents =
        courtRevenueInCents + barSalesInCents + fixedContractsRevenueInCents;

      const allCosts = await financeCosts
        .find({
          complexId,

          $or: [
            {
              type: "FIXED",
              createdAt: {
                $lt: end,
              },
            },
            {
              type: "VARIABLE",
              month,
            },
          ],
        })
        .toArray();

      const fixedCostsInCents = allCosts
        .filter((cost) => cost.type === "FIXED")
        .reduce((sum, cost) => sum + cost.amountInCents, 0);

      const variableCostsInCents = allCosts
        .filter((cost) => cost.type === "VARIABLE")
        .reduce((sum, cost) => sum + cost.amountInCents, 0);

      const totalCostsInCents = fixedCostsInCents + variableCostsInCents;

      const netProfitInCents = totalRevenueInCents - totalCostsInCents;

      return response.status(200).json({
        month,

        revenue: {
          courtRentalsInCents: courtRevenueInCents,
          barSalesInCents,
          fixedContractsInCents: fixedContractsRevenueInCents,
          totalInCents: totalRevenueInCents,
        },

        costs: {
          fixedInCents: fixedCostsInCents,
          variableInCents: variableCostsInCents,
          totalInCents: totalCostsInCents,
        },

        netProfitInCents,
      });
    } catch (error) {
      console.error("Erro ao calcular resumo financeiro:", error);

      return response.status(500).json({
        message: "Erro interno ao calcular o resumo financeiro.",
      });
    }
  },
);

/**
 * ============================================================
 * CARTEIRA E REPASSES PIX
 * ============================================================
 */

router.get(
  "/admin/wallet",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const complexId = request.admin.complexId;
      const { payoutAccounts } = await getCollections();

      const [totalPaidInCents, futureReceivableInCents, payoutsInCents, payoutAccount] =
        await Promise.all([
          sumPaidBookingRevenue(complexId),
          sumFutureReceivables(complexId),
          sumCompletedPayouts(complexId),
          payoutAccounts.findOne({
            complexId,
          }),
        ]);

      const availableInCents = Math.max(
        0,
        totalPaidInCents - payoutsInCents,
      );

      return response.status(200).json({
        availableInCents,
        futureReceivableInCents,

        payoutAccount: payoutAccount
          ? {
              bankName: payoutAccount.bankName,
              agency: payoutAccount.agency,
              accountNumber: payoutAccount.accountNumber,
              pixKeyType: payoutAccount.pixKeyType,
              pixKey: payoutAccount.pixKey,
              updatedAt: payoutAccount.updatedAt,
            }
          : null,
      });
    } catch (error) {
      console.error("Erro ao buscar carteira:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar a carteira.",
      });
    }
  },
);

const payoutAccountSchema = z.object({
  bankName: z.string().trim().min(2, {
    message: "Informe o nome do banco.",
  }),

  agency: z.string().trim().min(1, {
    message: "Informe a agência.",
  }),

  accountNumber: z.string().trim().min(1, {
    message: "Informe a conta corrente.",
  }),

  pixKeyType: z.enum(PIX_KEY_TYPES, {
    message: "Selecione o tipo de chave Pix.",
  }),

  pixKey: z.string().trim().min(3, {
    message: "Informe a chave Pix.",
  }),
});

router.patch(
  "/admin/wallet/payout-account",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    const parsedBody = payoutAccountSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        message: "Dados inválidos para atualizar a chave de repasse.",
        errors: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { payoutAccounts } = await getCollections();

      const now = new Date();

      const updatedAccount = await payoutAccounts.findOneAndUpdate(
        {
          complexId: request.admin.complexId,
        },
        {
          $set: {
            complexId: request.admin.complexId,
            ...parsedBody.data,
            updatedAt: now,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        },
      );

      return response.status(200).json({
        message: "Dados de repasse atualizados com sucesso.",
        payoutAccount: updatedAccount,
      });
    } catch (error) {
      console.error("Erro ao atualizar dados de repasse:", error);

      return response.status(500).json({
        message: "Erro interno ao atualizar os dados de repasse.",
      });
    }
  },
);

router.get(
  "/admin/wallet/payouts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const { payoutRequests } = await getCollections();

      const payouts = await payoutRequests
        .find({
          complexId: request.admin.complexId,
        })
        .sort({
          requestedAt: -1,
        })
        .toArray();

      return response.status(200).json({
        payouts,
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de repasses:", error);

      return response.status(500).json({
        message: "Erro interno ao buscar o histórico de repasses.",
      });
    }
  },
);

router.post(
  "/admin/wallet/payouts",
  authenticateAdmin,
  async (request: AuthenticatedAdminRequest, response) => {
    if (!request.admin) {
      return response.status(401).json({
        message: "Contexto administrativo não encontrado.",
      });
    }

    try {
      const complexId = request.admin.complexId;
      const { payoutAccounts, payoutRequests } = await getCollections();

      const payoutAccount = await payoutAccounts.findOne({
        complexId,
      });

      if (!payoutAccount) {
        return response.status(400).json({
          message:
            "Cadastre os dados bancários e a chave Pix antes de solicitar uma transferência.",
        });
      }

      const [totalPaidInCents, alreadyPaidOutInCents] = await Promise.all([
        sumPaidBookingRevenue(complexId),
        sumCompletedPayouts(complexId),
      ]);

      const availableInCents = Math.max(
        0,
        totalPaidInCents - alreadyPaidOutInCents,
      );

      if (availableInCents <= 0) {
        return response.status(400).json({
          message: "Não há saldo disponível para saque no momento.",
        });
      }

      const payout = {
        id: randomUUID(),
        complexId,

        amountInCents: availableInCents,

        status: "COMPLETED" as const,

        requestedAt: new Date(),
      };

      await payoutRequests.insertOne(payout);

      return response.status(201).json({
        message: "Transferência Pix solicitada com sucesso.",
        payout,
      });
    } catch (error) {
      console.error("Erro ao solicitar transferência Pix:", error);

      return response.status(500).json({
        message: "Erro interno ao solicitar a transferência Pix.",
      });
    }
  },
);

export default router;
