import type {
  AdminCourt,
  CreateAdminCourtPayload,
  UpdateAdminCourtPayload,
} from "@/types/admin";

type CourtBasePayload = Omit<CreateAdminCourtPayload, "slug">;

export const COURT_TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  return `${String(index + 8).padStart(2, "0")}:00`;
});

export type CourtFormValues = {
  slug: string;
  name: string;
  type: string;
  surface: string;
  price: string;
  players: string;
  minPlayers: string;
  goalkeeperPrice: string;
  highlight: string;
  description: string;
  imageUrl: string;
  times: string[];
  isActive: boolean;
};

export function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPriceInput(priceInCents: number) {
  return (priceInCents / 100).toFixed(2).replace(".", ",");
}

export function priceInputToCents(value: string) {
  const normalizedValue = value.trim().replace(/\./g, "").replace(",", ".");

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

export function optionalPriceInputToCents(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const normalizedValue = value.trim().replace(/\./g, "").replace(",", ".");

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

export function sortUniqueTimes(times: string[]) {
  return [...new Set(times)].sort();
}

export function createCourtFormValues(
  court?: AdminCourt | null,
): CourtFormValues {
  if (!court) {
    return {
      slug: "",
      name: "",
      type: "",
      surface: "",
      price: "",
      players: "",
      minPlayers: "",
      goalkeeperPrice: "",
      highlight: "",
      description: "",
      imageUrl: "",
      times: [],
      isActive: true,
    };
  }

  return {
    slug: court.slug,
    name: court.name,
    type: court.type,
    surface: court.surface,

    price: formatPriceInput(court.priceInCents),

    players: String(court.players),

    minPlayers: String(court.minPlayers ?? court.players),

    goalkeeperPrice: formatPriceInput(court.goalkeeperPriceInCents ?? 0),

    highlight: court.highlight,
    description: court.description,
    imageUrl: court.imageUrl,

    times: sortUniqueTimes(court.times),

    isActive: court.isActive,
  };
}

function basePayload(values: CourtFormValues): CourtBasePayload | null {
  const priceInCents = priceInputToCents(values.price);

  const players = Number(values.players);

  const minPlayers = values.minPlayers.trim()
    ? Number(values.minPlayers)
    : players;

  const goalkeeperPriceInCents = optionalPriceInputToCents(
    values.goalkeeperPrice,
  );

  if (
    !values.name.trim() ||
    !values.type.trim() ||
    !values.surface.trim() ||
    !values.description.trim() ||
    !values.imageUrl.trim() ||
    !priceInCents ||
    !Number.isInteger(players) ||
    players <= 0 ||
    !Number.isInteger(minPlayers) ||
    minPlayers <= 0 ||
    minPlayers > players ||
    goalkeeperPriceInCents === null ||
    values.times.length === 0
  ) {
    return null;
  }

  return {
    name: values.name.trim(),
    type: values.type.trim(),
    surface: values.surface.trim(),

    priceInCents,
    players,
    minPlayers,
    goalkeeperPriceInCents,

    highlight: values.highlight.trim(),

    description: values.description.trim(),

    imageUrl: values.imageUrl.trim(),

    times: sortUniqueTimes(values.times),

    isActive: values.isActive,
  };
}

export function createCourtPayload(
  values: CourtFormValues,
): CreateAdminCourtPayload | null {
  const payload = basePayload(values);

  const slug = normalizeSlug(values.slug);

  if (!payload || !slug) {
    return null;
  }

  return {
    slug,
    ...payload,
  };
}

export function updateCourtPayload(
  values: CourtFormValues,
): UpdateAdminCourtPayload | null {
  return basePayload(values);
}
