import type { Address } from "../database";

export type GeocodedCoordinates = {
  latitude: number;
  longitude: number;
};

/*
 * Usa o Nominatim (OpenStreetMap), que é gratuito e não exige
 * chave de API. A política de uso deles pede um identificador
 * na requisição e no máximo 1 requisição por segundo — por
 * isso o chamador deve espaçar as chamadas quando geocodificar
 * vários endereços em sequência (ver ensure-complex-coordinates.ts).
 */
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/*
 * O bairro informado no cadastro costuma ser um nome popular
 * (ex.: "Zona Norte") que não bate com o nome oficial usado
 * pelo OpenStreetMap, e isso faz a busca não encontrar nada.
 * Por isso ele não entra na consulta — rua, número, cidade,
 * estado e país já são o suficiente para localizar o endereço.
 */
function buildQuery(address: Address, includeNumber: boolean) {
  return [
    includeNumber ? `${address.street}, ${address.number}` : address.street,
    address.city,
    address.state,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

async function searchNominatim(
  query: string,
): Promise<GeocodedCoordinates | null> {
  const url = new URL(NOMINATIM_URL);

  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      /*
       * O Nominatim exige um User-Agent identificável.
       */
      "User-Agent": "JogaJunto/1.0 (contato@jogajunto.app)",
    },
  });

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
  }>;

  const first = results[0];

  if (!first) {
    return null;
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function geocodeAddress(
  address: Address,
): Promise<GeocodedCoordinates | null> {
  try {
    const preciseMatch = await searchNominatim(buildQuery(address, true));

    if (preciseMatch) {
      return preciseMatch;
    }

    /*
     * Sem resultado para o endereço exato (número pode não
     * existir na base do OpenStreetMap): tenta de novo só
     * pela rua, para ao menos aproximar a localização.
     * Respeita o limite de 1 requisição por segundo do
     * Nominatim antes de tentar de novo.
     */
    await sleep(1100);

    return await searchNominatim(buildQuery(address, false));
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);

    return null;
  }
}
