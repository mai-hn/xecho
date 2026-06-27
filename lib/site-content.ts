export type SiteProject = {
  id: string;
  slug: string;
  title: string;
  meta: string;
  body: string;
  href: string;
  external: boolean;
  display_order: number;
};

export type SiteTool = {
  id: string;
  slug: string;
  title: string;
  body: string;
  href: string;
  icon: string;
  external: boolean;
  display_order: number;
};

export type SiteContent = {
  projects: SiteProject[];
  tools: SiteTool[];
};

const DEFAULT_SITE_API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';

export const SITE_API_URL = process.env.NEXT_PUBLIC_SITE_API ?? process.env.NEXT_PUBLIC_MODEL_TEST_API ?? DEFAULT_SITE_API_URL;

export async function fetchSiteContent(signal?: AbortSignal): Promise<SiteContent> {
  const response = await fetch(`${SITE_API_URL}/site/content`, { signal });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.detail ?? '无法读取站点内容。');
  }

  return payload as SiteContent;
}
