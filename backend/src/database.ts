import "dotenv/config";
import { MongoClient, type Db } from "mongodb";

export type BookingStatus =
  "WAITING_PLAYERS" | "PAYMENT_AVAILABLE" | "COMPLETED" | "CANCELLED";

export type PlayerStatus = "WAITING_PAYMENT" | "PAID" | "CANCELLED";

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminRole = "COMPLEX_ADMIN";

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;

  role: AdminRole;

  complexId: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type Address = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;

  /*
   * Preenchidas automaticamente por geocodificação do
   * endereço (ver services/geocode-address.ts). Ficam nulas
   * até a primeira vez que o complexo é geocodificado.
   */
  latitude: number | null;
  longitude: number | null;
};

export type LeisureAreaBlock = {
  id: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
  isActive: boolean;
};

export type LeisureArea = {
  id: string;
  complexId: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  blocks: LeisureAreaBlock[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LeisureBookingStatus =
  "ACTIVE" | "CANCELLED_NO_PARTICIPANTS" | "CANCELLED_WITH_BOOKING";

export type BookingLeisureArea = {
  areaId: string;
  areaSlug: string;
  areaName: string;
  blockId: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
};

export type ComplexCourtReference = {
  id: string;
  slug: string;
  name: string;
  type: string;
};

export type Complex = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  phone: string | null;
  whatsapp: string | null;
  address: Address;

  courts: ComplexCourtReference[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Court = {
  id: string;

  complexId: string;
  complexSlug: string;

  slug: string;
  name: string;
  type: string;
  surface: string;
  location: string;

  priceInCents: number;
  players: number;

  /*
   * Mínimo de jogadores para liberar o pagamento desta quadra.
   * Documentos antigos não possuem o campo: usa-se `players`.
   */
  minPlayers?: number;

  /*
   * Valor do goleiro, rateado entre os jogadores quando a
   * reserva inclui um goleiro. O goleiro não paga.
   */
  goalkeeperPriceInCents?: number;

  highlight: string;
  description: string;
  imageUrl: string;
  times: string[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type BookingPlayer = {
  id: string;
  bookingId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  teamNumber: number;
  status: PlayerStatus;
  amountToPayInCents: number;
  pixCopyPaste: string;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participatesInLeisure?: boolean;

  courtShareInCents?: number;

  leisureShareInCents?: number;

  courtPlatformFeeInCents?: number;

  leisurePlatformFeeInCents?: number;
};

export type Booking = {
  id: string;
  shareCode: string;

  captainUserId: string;
  captainName: string;

  courtSlug: string;
  courtName: string;
  courtType: string;
  location: string;

  bookingDate: string;
  startTime: string;

  courtPriceInCents: number;
  goalkeeperPriceInCents: number;
  totalPriceInCents: number;
  expectedPlayers: number;

  /*
   * Mínimo de jogadores que libera o pagamento, copiado da
   * quadra na criação. Reservas antigas usam expectedPlayers.
   */
  minPlayers?: number;

  /*
   * A reserva inclui um goleiro avulso. O custo entra em
   * goalkeeperPriceInCents/totalPriceInCents e é rateado entre
   * os jogadores; o goleiro em si não paga.
   */
  includeGoalkeeper?: boolean;

  teamOneName: string;
  teamTwoName: string;

  platformFeeInCents: number;
  bookingStatus: BookingStatus;

  // Reserva ocupa ou não o slot da quadra.
  slotActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  complexId?: string;

  leisureArea?: BookingLeisureArea | null;

  leisureStatus?: LeisureBookingStatus | null;

  leisureSlotActive?: boolean;

  pricingFrozenAt?: Date | null;
};

export type BookingWithPlayers = Booking & {
  players: BookingPlayer[];
};

/**
 * ============================================================
 * ESTOQUE DO BAR (PDV)
 * ============================================================
 */

export type BarProduct = {
  id: string;
  complexId: string;

  name: string;
  category: string;

  priceInCents: number;

  currentStock: number;
  minimumStock: number;

  createdAt: Date;
  updatedAt: Date;
};

/**
 * ============================================================
 * FINANCEIRO (CUSTOS E CONTRATOS)
 * ============================================================
 */

export type FinanceCostType = "FIXED" | "VARIABLE";

export type FinanceCost = {
  id: string;
  complexId: string;

  description: string;
  type: FinanceCostType;
  amountInCents: number;

  /*
   * Custos fixos não têm mês: contam em todo mês a partir de
   * createdAt, até serem removidos. Custos variáveis têm um
   * mês certo ("YYYY-MM"), lançado pelo administrador.
   */
  month: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export type FinanceContract = {
  id: string;
  complexId: string;

  description: string;
  category: string;
  amountInCents: number;

  createdAt: Date;
  updatedAt: Date;
};

/**
 * ============================================================
 * CARTEIRA E REPASSES PIX
 * ============================================================
 */

export type PixKeyType = "EMAIL" | "PHONE" | "CPF_CNPJ" | "RANDOM";

export type PayoutAccount = {
  complexId: string;

  bankName: string;
  agency: string;
  accountNumber: string;

  pixKeyType: PixKeyType;
  pixKey: string;

  updatedAt: Date;
};

export type PayoutRequest = {
  id: string;
  complexId: string;

  amountInCents: number;

  /*
   * Não existe integração real com um provedor de pagamento
   * ainda: o repasse é registrado como concluído na hora,
   * simulando o que vai acontecer quando o Pix de verdade
   * for implementado.
   */
  status: "COMPLETED";

  requestedAt: Date;
};

let client: MongoClient | null = null;
let db: Db | null = null;

const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017";
const databaseName = process.env.MONGODB_DATABASE || "jogajunto";

export async function connectDatabase() {
  if (db) {
    return db;
  }

  client = new MongoClient(mongoUrl);
  await client.connect();

  db = client.db(databaseName);
  await createIndexes(db);

  console.log(`MongoDB conectado: ${databaseName}`);

  return db;
}

async function createIndexes(database: Db) {
  await database
    .collection<User>("users")
    .createIndex({ email: 1 }, { unique: true });

  await database
    .collection<Complex>("complexes")
    .createIndex({ slug: 1 }, { unique: true });

  await database
    .collection<Court>("courts")
    .createIndex({ slug: 1 }, { unique: true });

  await database
    .collection<Court>("courts")
    .createIndex({ complexId: 1, isActive: 1 });

  await database
    .collection<Booking>("bookings")
    .createIndex({ shareCode: 1 }, { unique: true });

  await database
    .collection<AdminUser>("adminUsers")
    .createIndex({ email: 1 }, { unique: true });

  await database
    .collection<AdminUser>("adminUsers")
    .createIndex({ complexId: 1 });

  await database.collection<Booking>("bookings").createIndex(
    {
      courtSlug: 1,
      bookingDate: 1,
      startTime: 1,
    },
    {
      unique: true,
      partialFilterExpression: {
        slotActive: true,
      },
      name: "uniq_active_booking_slot",
    },
  );

  await database.collection<BookingPlayer>("bookingPlayers").createIndex(
    {
      bookingId: 1,
      userId: 1,
    },
    { unique: true },
  );

  await database
    .collection<BookingPlayer>("bookingPlayers")
    .createIndex({ bookingId: 1, createdAt: 1 });

  await database.collection<LeisureArea>("leisureAreas").createIndex(
    {
      complexId: 1,
      slug: 1,
    },
    {
      unique: true,
      name: "uniq_complex_leisure_slug",
    },
  );

  await database.collection<Booking>("bookings").createIndex(
    {
      "leisureArea.areaId": 1,
      bookingDate: 1,
      "leisureArea.blockId": 1,
    },
    {
      unique: true,
      partialFilterExpression: {
        leisureSlotActive: true,
      },
      name: "uniq_active_leisure_slot",
    },
  );

  await database
    .collection<BarProduct>("barProducts")
    .createIndex({ complexId: 1 });

  await database
    .collection<FinanceCost>("financeCosts")
    .createIndex({ complexId: 1, type: 1, month: 1 });

  await database
    .collection<FinanceContract>("financeContracts")
    .createIndex({ complexId: 1 });

  await database
    .collection<PayoutAccount>("payoutAccounts")
    .createIndex({ complexId: 1 }, { unique: true });

  await database
    .collection<PayoutRequest>("payoutRequests")
    .createIndex({ complexId: 1, requestedAt: -1 });
}

export async function getCollections() {
  const database = await connectDatabase();

  return {
    users: database.collection<User>("users"),
    complexes: database.collection<Complex>("complexes"),
    courts: database.collection<Court>("courts"),
    bookings: database.collection<Booking>("bookings"),
    bookingPlayers: database.collection<BookingPlayer>("bookingPlayers"),
    adminUsers: database.collection<AdminUser>("adminUsers"),
    leisureAreas: database.collection<LeisureArea>("leisureAreas"),
    barProducts: database.collection<BarProduct>("barProducts"),
    financeCosts: database.collection<FinanceCost>("financeCosts"),
    financeContracts:
      database.collection<FinanceContract>("financeContracts"),
    payoutAccounts: database.collection<PayoutAccount>("payoutAccounts"),
    payoutRequests: database.collection<PayoutRequest>("payoutRequests"),
  };
}

export function getRequiredPlayers(
  booking: { expectedPlayers: number; minPlayers?: number | null | undefined },
) {
  return Math.min(
    booking.minPlayers ?? booking.expectedPlayers,
    booking.expectedPlayers,
  );
}

export function withoutMongoId<T extends { _id: unknown }>(
  document: T,
): Omit<T, "_id"> {
  const { _id, ...rest } = document;

  return rest;
}

export function withoutMongoIds<T extends { _id: unknown }>(
  documents: T[],
): Omit<T, "_id">[] {
  return documents.map((document) => withoutMongoId(document));
}
