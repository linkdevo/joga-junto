export type ComplexAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;

  /*
   * Podem vir nulas quando o complexo ainda não foi
   * geocodificado pelo backend.
   */
  latitude?: number | null;
  longitude?: number | null;
};

export type CourtComplex = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  address: ComplexAddress;
  leisureAreas: {
    available: boolean;
    count: number;
  };
};

export type Court = {
  id: string;
  slug: string;

  name: string;
  type: string;
  surface: string;

  priceInCents: number;
  players: number;

  highlight: string;
  description: string;
  imageUrl: string;

  times: string[];

  complex: CourtComplex;
};
