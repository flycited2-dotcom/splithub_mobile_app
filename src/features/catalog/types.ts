export type Product = {
  id: string;
  sku: string;
  brand: string;
  brandCode?: string;
  model: string;
  group: string;
  series?: string;
  factory?: string;
  color?: string;
  btu?: string;
  area?: number;
  cardBenef?: string;
  compressor?: string;
  freon?: string;
  type?: string;
  price: number;
  stock: string;
  stockLabel: string;
  descShort: string;
  benefits: string[];
  photo: string;
};

export type CatalogSnapshot = {
  version: string;
  updated_at: string;
  products: Product[];
};
