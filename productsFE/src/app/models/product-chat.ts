/** Matches backend swagger: CreateProductDto / ProductDto */
export interface CreateProductDto {
  productName: string;
  description?: string | null;
  price: number;
  quantity: number;
  category?: string | null;
  brand?: string | null;
  productImage?: string | null;
  isActive: boolean;
}

export interface ProductDto extends CreateProductDto {
  productId: number;
  createdAt: string;
  updatedAt?: string | null;
}

/** Backend bulk wrapper — key is `dossiers` even for products. */
export interface BulkCreateProductDto {
  dossiers: CreateProductDto[];
}

/** Local UI record: backend product + upload metadata. */
export interface ProductRecord extends CreateProductDto {
  productId?: number;
  fileName: string;
  fileSize: string;
  uploadDate: Date;
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  productData?: ProductRecord;
  timestamp: Date;
}
