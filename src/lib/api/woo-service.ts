// src/lib/api/woo-service.ts
import { httpClient } from "./http-client";

// Types
export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WooProduct {
  id: number;
  name: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  stock_status: string;
  stock_quantity: number | null;
  permalink: string;
  image: string | null;
}

export interface SkippedProduct {
  product_id: number;
  product_name: string;
  sku?: string;
  reason: string;
  regular_price?: string;
  current_sale_price?: string;
}

export interface SaleResult {
  batch_id: string;
  category_name?: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
  dry_run: boolean;
  total: number;
  applied: number;
  skipped: number;
  failed: number;
  skipped_products: SkippedProduct[];
  error?: string;
  message?: string;
}

export interface SaleBatch {
  batch_id: string;
  total: number;
  applied: number;
  skipped: number;
  rolled_back: number;
  failed: number;
  dry_run: boolean;
  category_name: string | null;
  discount_percent: number | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  created_at: string | null;
}

export interface BatchEvent {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  regular_price: number;
  original_sale_price: number | null;
  new_sale_price: number;
  status: "pending" | "applied" | "skipped" | "rolled_back" | "failed";
  skip_reason: string | null;
}

export interface BatchDetails {
  summary: SaleBatch;
  events: BatchEvent[];
}

export interface ApplySaleRequest {
  category_id?: number;
  category_name?: string;
  product_ids?: number[];
  discount_type: "percent" | "amount";
  discount_value: number;
  adjustment_type: "decrease" | "increase";
  start_date?: string;
  end_date?: string;
}

export interface RollbackResult {
  batch_id: string;
  total: number;
  rolled_back: number;
  failed: number;
  errors?: Array<{
    product_id: number;
    product_name: string;
    error: string;
  }>;
  message?: string;
}

// WooCommerce Service
export const wooService = {
  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  async getCategories(): Promise<WooCategory[]> {
    const response = await httpClient.get<{ success: boolean; data: WooCategory[] }>(
      "/portal/admin/woo/categories"
    );
    return response.data || [];
  },

  // -------------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------------

  async getCategoryProducts(
    categoryId: number,
    inStockOnly = true
  ): Promise<WooProduct[]> {
    const response = await httpClient.get<{
      success: boolean;
      data: WooProduct[];
      meta: { total: number; in_stock_only: boolean };
    }>(`/portal/admin/woo/categories/${categoryId}/products?in_stock_only=${inStockOnly}`);
    return response.data || [];
  },

  // -------------------------------------------------------------------------
  // Sales
  // -------------------------------------------------------------------------

  async previewSale(request: ApplySaleRequest): Promise<SaleResult> {
    const response = await httpClient.post<{ success: boolean; data: SaleResult }>(
      "/portal/admin/woo/sales/preview",
      request
    );
    return response.data;
  },

  async applySale(request: ApplySaleRequest): Promise<SaleResult> {
    const response = await httpClient.post<{
      success: boolean;
      data: SaleResult;
      message?: string;
    }>("/portal/admin/woo/sales/apply", request);
    return response.data;
  },

  // -------------------------------------------------------------------------
  // Batches
  // -------------------------------------------------------------------------

  async getBatches(limit = 20): Promise<SaleBatch[]> {
    const response = await httpClient.get<{ success: boolean; data: SaleBatch[] }>(
      `/portal/admin/woo/sales/batches?limit=${limit}`
    );
    return response.data || [];
  },

  async getBatchDetails(batchId: string): Promise<BatchDetails> {
    const response = await httpClient.get<{ success: boolean; data: BatchDetails }>(
      `/portal/admin/woo/sales/batches/${batchId}`
    );
    return response.data;
  },

  async rollbackBatch(batchId: string): Promise<RollbackResult> {
    const response = await httpClient.post<{
      success: boolean;
      data: RollbackResult;
      message?: string;
    }>(`/portal/admin/woo/sales/rollback/${batchId}`);
    return response.data;
  },
};
