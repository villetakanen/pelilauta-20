/**
 * Pure, synchronous helper that turns SEO props + request URL into a structured
 * emission descriptor consumed by AppShell.astro. No Astro imports, no module-level
 * state, no side effects — entirely unit-testable without a renderer.
 *
 * See specs/cyan-ds/layouts/seo/spec.md for the full contract.
 */

export interface SeoHeadInput {
  title: string;
  description: string;
  image?: string;
  defaultImage?: string;
  siteName?: string;
  noSharing?: boolean;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  breadcrumbs?: Array<{ label: string; href: string }>;
  layout: "view" | "sidebar" | "editor" | "modal";
  url: URL;
  generator?: string;
}

export interface SeoHeadOutput {
  /** Verbatim from input.title */
  title: string;
  /** url.origin + "/" for editor; url.toString() otherwise */
  canonicalHref: string;
  /** Verbatim from input.description */
  description: string;
  generator?: string;
  /** true when noSharing OR layout==="editor" OR layout==="modal" */
  robotsNoindex: boolean;
  /** false when robotsNoindex */
  socialEmissionsAllowed: boolean;
  ogTitle?: string;
  ogDescription?: string;
  /** Resolved absolute URL or undefined */
  ogImage?: string;
  ogUrl?: string;
  ogType?: "website" | "article";
  ogSiteName?: string;
  twitterCard?: "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  /** Full JSON string for the <script> body, or null when suppressed */
  jsonLdScript: string | null;
}

export function buildSeoHead(input: SeoHeadInput): SeoHeadOutput {
  const {
    title,
    description,
    image,
    defaultImage,
    siteName,
    ogType,
    jsonLd,
    breadcrumbs,
    layout,
    url,
    generator,
  } = input;

  // Step 1: determine effective noSharing
  const effectiveNoSharing = input.noSharing === true || layout === "editor" || layout === "modal";

  // Step 2: social emissions flag
  const socialEmissionsAllowed = !effectiveNoSharing;

  // Step 3: canonical URL
  // Editor layout: origin only (deliberate v17 anti-indexing pattern)
  // All others: full request URL
  // Note: URL#origin has no trailing slash (e.g. "https://host.example"),
  // so we append "/" to match the spec's <link rel="canonical" href="https://host.example/">.
  const canonicalHref = layout === "editor" ? `${url.origin}/` : url.toString();

  // Step 4: robots noindex
  const robotsNoindex = effectiveNoSharing;

  // Step 5: image cascade (only when social emissions allowed)
  let ogImage: string | undefined;
  if (socialEmissionsAllowed) {
    const picked = image ?? defaultImage;
    if (picked !== undefined) {
      if (picked.startsWith("http://") || picked.startsWith("https://")) {
        ogImage = picked;
      } else {
        ogImage = new URL(picked, url.origin).toString();
      }
    }
  }

  // Step 6: OG / Twitter tag block (only when social emissions allowed)
  let ogTitle: string | undefined;
  let ogDescription: string | undefined;
  let ogUrl: string | undefined;
  let resolvedOgType: "website" | "article" | undefined;
  let ogSiteName: string | undefined;
  let twitterCard: "summary_large_image" | undefined;
  let twitterTitle: string | undefined;
  let twitterDescription: string | undefined;
  let twitterImage: string | undefined;

  if (socialEmissionsAllowed) {
    ogTitle = title;
    ogDescription = description;
    ogUrl = canonicalHref;
    resolvedOgType = ogType ?? "website";
    // Only emit ogSiteName when siteName is explicitly supplied (never default to empty)
    ogSiteName = siteName !== undefined && siteName !== "" ? siteName : undefined;
    twitterCard = "summary_large_image";
    twitterTitle = title;
    twitterDescription = description;
    twitterImage = ogImage;
  }

  // Step 7: JSON-LD (only when social emissions allowed AND jsonLd or breadcrumbs supplied)
  let jsonLdScript: string | null = null;

  if (socialEmissionsAllowed && (jsonLd !== undefined || breadcrumbs !== undefined)) {
    // Build BreadcrumbList if breadcrumbs supplied
    let breadcrumbObject: Record<string, unknown> | undefined;
    if (breadcrumbs !== undefined && breadcrumbs.length > 0) {
      breadcrumbObject = {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.label,
          item: new URL(crumb.href, url.origin).toString(),
        })),
      };
    }

    let payload: unknown;

    if (jsonLd === undefined && breadcrumbObject !== undefined) {
      // Only breadcrumbs, no jsonLd — emit BreadcrumbList verbatim (single object)
      payload = {
        "@context": "https://schema.org",
        ...breadcrumbObject,
      };
    } else if (Array.isArray(jsonLd)) {
      // jsonLd is an array — wrap in @graph along with breadcrumbs if any
      const graphItems: Record<string, unknown>[] = [...jsonLd];
      if (breadcrumbObject !== undefined) {
        graphItems.push(breadcrumbObject);
      }
      payload = {
        "@context": "https://schema.org",
        "@graph": graphItems,
      };
    } else if (jsonLd !== undefined) {
      // jsonLd is a single object
      if (breadcrumbObject !== undefined) {
        // Both single jsonLd and breadcrumbs — wrap in @graph
        payload = {
          "@context": "https://schema.org",
          "@graph": [jsonLd, breadcrumbObject],
        };
      } else {
        // Single object, no breadcrumbs — emit verbatim
        payload = jsonLd;
      }
    }

    if (payload !== undefined) {
      // Escape `<` to prevent `</script>` (and `<!--`/`-->`) inside string
      // values from breaking out of the <script type="application/ld+json">
      // body. `<` decodes back to `<` under JSON.parse, so consumers
      // (Google, Bing, Schema.org validators) see the original payload.
      jsonLdScript = JSON.stringify(payload).replace(/</g, "\\u003c");
    }
  }

  // Step 8: pass generator through
  return {
    title,
    canonicalHref,
    description,
    generator,
    robotsNoindex,
    socialEmissionsAllowed,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType: resolvedOgType,
    ogSiteName,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    jsonLdScript,
  };
}
