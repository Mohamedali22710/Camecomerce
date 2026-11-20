export interface CCTVProduct {
  _id: string;
  en_name: string;
  ar_name?: string;
  en_description?: string;
  ar_description?: string;
  price: number;
  discount?: number | null;
  imageURLs?: string;
  images?: string[];
  subcategoryId?: string;
  isActive?: boolean;
  variants?: string;
}

export interface ProductCardCctvProps {
  product: CCTVProduct;
  className?: string;
  priority?: boolean;
}

