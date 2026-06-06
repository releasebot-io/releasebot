// Types mirror the Releasebot REST API response shapes (/api/v1/*).
// See releasebot.io/data for the canonical API docs.

export interface Vendor {
  id: number;
  slug: string;
  name: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
}

export interface ReleaseDetails {
  release_name?: string;
  release_number?: string;
  release_summary?: string;
  is_release?: boolean;
  release_deep_source?: string;
}

export interface Release {
  id: number;
  slug: string;
  releaseDate: string | null;
  createdAt: string | null;
  releaseDetails: ReleaseDetails | null;
  formattedContent: string | null;
  lastModifiedContent: string | null;
  product: Product | null;
  vendor: Vendor | null;
  source: { id: number; url: string } | null;
}

/** The search RPC returns a mixed vendor/product/release shape; keep it open. */
export type SearchResult = Record<string, unknown>;

export interface SearchResponse {
  query: string;
  total: number;
  fallbackUsed: boolean;
  results: SearchResult[];
}

export interface ReleasesResponse {
  releases: Release[];
  nextOffset: number | null;
  total: number;
}

export type FeedResponse = ReleasesResponse;

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
}

export interface ReleasesParams {
  vendorSlug?: string;
  vendorId?: number;
  productSlug?: string;
  productId?: number;
  limit?: number;
  offset?: number;
  /** ISO date string — only return releases on or before this date. */
  before?: string;
}

export interface FeedParams {
  limit?: number;
  offset?: number;
  before?: string;
}

export interface ClientConfig {
  apiKey: string;
  /** Defaults to https://releasebot.io/api/v1 */
  baseUrl?: string;
}
