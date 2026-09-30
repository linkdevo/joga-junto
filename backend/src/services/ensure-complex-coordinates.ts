import { getCollections, type Address } from "../database";
import { geocodeAddress } from "./geocode-address";

export type CourtWithComplexAddress = {
  complex: {
    id: string;
    address: Address;
  };
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/*
 * Preenche latitude/longitude dos complexos que ainda não
 * foram geocodificados (mutando os itens recebidos), e salva
 * o resultado no banco para as próximas requisições não
 * precisarem geocodificar de novo.
 *
 * Cada complexo só é geocodificado uma vez na vida: depois
 * que "address.latitude/longitude" é salvo, ele nunca mais
 * entra nesta função.
 */
export async function ensureComplexesGeocoded<
  T extends CourtWithComplexAddress,
>(items: T[]): Promise<void> {
  const complexesToGeocode = new Map<string, T["complex"]>();

  for (const item of items) {
    const { latitude, longitude } = item.complex.address;

    /*
     * Usa == de propósito: complexos cadastrados antes deste
     * campo existir têm o valor `undefined` (não `null`), e
     * os dois casos precisam ser geocodificados.
     */
    if (
      (latitude == null || longitude == null) &&
      !complexesToGeocode.has(item.complex.id)
    ) {
      complexesToGeocode.set(item.complex.id, item.complex);
    }
  }

  if (complexesToGeocode.size === 0) {
    return;
  }

  const { complexes } = await getCollections();

  let isFirstRequest = true;

  for (const [complexId, complexSummary] of complexesToGeocode) {
    if (!isFirstRequest) {
      /*
       * O Nominatim pede no máximo 1 requisição por segundo.
       */
      await sleep(1100);
    }

    isFirstRequest = false;

    const coordinates = await geocodeAddress(complexSummary.address);

    if (!coordinates) {
      continue;
    }

    await complexes.updateOne(
      {
        id: complexId,
      },
      {
        $set: {
          "address.latitude": coordinates.latitude,
          "address.longitude": coordinates.longitude,
          updatedAt: new Date(),
        },
      },
    );

    for (const item of items) {
      if (item.complex.id === complexId) {
        item.complex.address.latitude = coordinates.latitude;
        item.complex.address.longitude = coordinates.longitude;
      }
    }
  }
}
