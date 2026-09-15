export type ComplexAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export type CourtComplex = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  address: ComplexAddress;
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
