import type {
  ClientConfig,
  SearchParams,
  SearchResponse,
  ReleasesParams,
  ReleasesResponse,
  FeedParams,
  FeedResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://releasebot.io/api/v1";

export class ReleasebotApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ReleasebotApiError";
  }
}

type QueryValue = string | number | undefined;

export class ReleasebotClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error("ReleasebotClient: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private async get<T>(path: string, params: Record<string, QueryValue>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        // Non-JSON body; fall back to status text.
      }
      throw new ReleasebotApiError(res.status, message);
    }

    return (await res.json()) as T;
  }

  /** Search vendors, products, or releases by keyword. No credits charged. */
  search(params: SearchParams): Promise<SearchResponse> {
    return this.get<SearchResponse>("/search", {
      q: params.q,
      limit: params.limit,
      offset: params.offset,
    });
  }

  /** List recent releases for a vendor and/or product. Charges 1 credit per release. */
  releases(params: ReleasesParams): Promise<ReleasesResponse> {
    return this.get<ReleasesResponse>("/releases", {
      vendorSlug: params.vendorSlug,
      vendorId: params.vendorId,
      productSlug: params.productSlug,
      productId: params.productId,
      limit: params.limit,
      offset: params.offset,
      before: params.before,
    });
  }

  /** List releases from the authenticated key's followed feed. Charges 1 credit per release. */
  feed(params: FeedParams = {}): Promise<FeedResponse> {
    return this.get<FeedResponse>("/feed", {
      limit: params.limit,
      offset: params.offset,
      before: params.before,
    });
  }
}
