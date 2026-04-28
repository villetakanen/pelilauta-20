import { describe, expect, it } from "vitest";
import { buildSeoHead } from "./seoHead.js";

/**
 * `buildSeoHead` is the pure-data half of the AppShell SEO surface. It decides
 * *what* tags should exist and *what* values they carry; AppShell.astro decides
 * the order those tags appear in <head> (a head-loading-perf concern that is
 * deliberately kept separate from emission logic). Asserting branch coverage
 * directly on the structured descriptor is faster and clearer than parsing a
 * rendered head fragment per posture.
 *
 * Template-side behaviour (sidebar spawns a Tray, modal sets AppBar mode,
 * default layout is "view") is covered by E2E in app/pelilauta/e2e/* and
 * app/cyan-ds/e2e/*, where the rendered HTML is the contract.
 *
 * See specs/cyan-ds/layouts/seo/spec.md for the full contract.
 */

// ---------------------------------------------------------------------------
// SEO Head Emission Scenarios (specs/cyan-ds/layouts/seo/spec.md §Testing Scenarios)
// ---------------------------------------------------------------------------

const BASE_URL = new URL("https://host.example/some/path");

describe("buildSeoHead — public page emits full SEO/AEO metadata", () => {
  const result = buildSeoHead({
    title: "Test Title",
    description: "Test description for the page.",
    image: "https://host.example/images/hero.jpg",
    siteName: "Pelilauta",
    ogType: "article",
    jsonLd: { "@type": "Article", name: "Test Title" },
    layout: "view",
    url: BASE_URL,
    generator: "Astro v5",
  });

  it("passes title through verbatim", () => {
    expect(result.title).toBe("Test Title");
  });

  it("canonical href equals url.toString()", () => {
    expect(result.canonicalHref).toBe(BASE_URL.toString());
  });

  it("passes description through verbatim", () => {
    expect(result.description).toBe("Test description for the page.");
  });

  it("ogTitle mirrors title", () => {
    expect(result.ogTitle).toBe("Test Title");
  });

  it("ogDescription mirrors description", () => {
    expect(result.ogDescription).toBe("Test description for the page.");
  });

  it("ogImage is the supplied absolute URL", () => {
    expect(result.ogImage).toBe("https://host.example/images/hero.jpg");
  });

  it("ogUrl equals url.toString()", () => {
    expect(result.ogUrl).toBe(BASE_URL.toString());
  });

  it("ogType is 'article'", () => {
    expect(result.ogType).toBe("article");
  });

  it("ogSiteName is 'Pelilauta'", () => {
    expect(result.ogSiteName).toBe("Pelilauta");
  });

  it("twitterCard is 'summary_large_image'", () => {
    expect(result.twitterCard).toBe("summary_large_image");
  });

  it("twitterTitle mirrors title", () => {
    expect(result.twitterTitle).toBe("Test Title");
  });

  it("twitterDescription mirrors description", () => {
    expect(result.twitterDescription).toBe("Test description for the page.");
  });

  it("twitterImage mirrors ogImage", () => {
    expect(result.twitterImage).toBe("https://host.example/images/hero.jpg");
  });

  it("jsonLdScript contains the supplied object's JSON", () => {
    expect(result.jsonLdScript).not.toBeNull();
    const parsed = JSON.parse(result.jsonLdScript as string);
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.name).toBe("Test Title");
  });

  it("robotsNoindex is false", () => {
    expect(result.robotsNoindex).toBe(false);
  });

  it("socialEmissionsAllowed is true", () => {
    expect(result.socialEmissionsAllowed).toBe(true);
  });
});

describe("buildSeoHead — breadcrumbs emit BreadcrumbList JSON-LD with absolute URLs", () => {
  const url = new URL("https://host.example/");
  const result = buildSeoHead({
    title: "Breadcrumb Test",
    description: "Testing breadcrumbs.",
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Threads", href: "/threads" },
    ],
    layout: "view",
    url,
  });

  it("jsonLdScript is not null", () => {
    expect(result.jsonLdScript).not.toBeNull();
  });

  it("JSON-LD has @context 'https://schema.org'", () => {
    const parsed = JSON.parse(result.jsonLdScript as string);
    expect(parsed["@context"]).toBe("https://schema.org");
  });

  it("JSON-LD contains a BreadcrumbList with 2 items", () => {
    const parsed = JSON.parse(result.jsonLdScript as string);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(2);
  });

  it("first entry: position=1, name='Home', item='https://host.example/'", () => {
    const parsed = JSON.parse(result.jsonLdScript as string);
    const first = parsed.itemListElement[0];
    expect(first.position).toBe(1);
    expect(first.name).toBe("Home");
    expect(first.item).toBe("https://host.example/");
  });

  it("second entry: position=2, name='Threads', item='https://host.example/threads'", () => {
    const parsed = JSON.parse(result.jsonLdScript as string);
    const second = parsed.itemListElement[1];
    expect(second.position).toBe(2);
    expect(second.name).toBe("Threads");
    expect(second.item).toBe("https://host.example/threads");
  });
});

describe("buildSeoHead — noSharing=true suppresses social tags and JSON-LD", () => {
  const result = buildSeoHead({
    title: "Private Page",
    description: "This page is not shared.",
    image: "https://host.example/img.jpg",
    jsonLd: { "@type": "WebPage", name: "Private" },
    noSharing: true,
    layout: "view",
    url: BASE_URL,
  });

  it("robotsNoindex is true", () => {
    expect(result.robotsNoindex).toBe(true);
  });

  it("socialEmissionsAllowed is false", () => {
    expect(result.socialEmissionsAllowed).toBe(false);
  });

  it("ogTitle is undefined", () => {
    expect(result.ogTitle).toBeUndefined();
  });

  it("ogDescription is undefined", () => {
    expect(result.ogDescription).toBeUndefined();
  });

  it("ogImage is undefined", () => {
    expect(result.ogImage).toBeUndefined();
  });

  it("ogUrl is undefined", () => {
    expect(result.ogUrl).toBeUndefined();
  });

  it("ogType is undefined", () => {
    expect(result.ogType).toBeUndefined();
  });

  it("ogSiteName is undefined", () => {
    expect(result.ogSiteName).toBeUndefined();
  });

  it("twitterCard is undefined", () => {
    expect(result.twitterCard).toBeUndefined();
  });

  it("twitterTitle is undefined", () => {
    expect(result.twitterTitle).toBeUndefined();
  });

  it("twitterDescription is undefined", () => {
    expect(result.twitterDescription).toBeUndefined();
  });

  it("twitterImage is undefined", () => {
    expect(result.twitterImage).toBeUndefined();
  });

  it("jsonLdScript is null (suppressed even though jsonLd was supplied)", () => {
    expect(result.jsonLdScript).toBeNull();
  });

  it("title still passes through", () => {
    expect(result.title).toBe("Private Page");
  });

  it("description still passes through", () => {
    expect(result.description).toBe("This page is not shared.");
  });
});

describe("buildSeoHead — editor layout renders origin-only canonical", () => {
  // The spec says <link rel="canonical" href="https://host.example/"> (with trailing slash).
  // URL#origin returns "https://host.example" (no trailing slash).
  // buildSeoHead appends "/" to match the spec exactly: url.origin + "/".
  const editorUrl = new URL("https://host.example/threads/abc/edit");
  const result = buildSeoHead({
    title: "Edit Thread",
    description: "Editing a thread.",
    jsonLd: { "@type": "WebPage" },
    layout: "editor",
    url: editorUrl,
  });

  it("canonicalHref is origin + '/' (no path)", () => {
    // Chosen behaviour: url.origin + "/" = "https://host.example/"
    // This matches the spec's <link rel="canonical" href="https://host.example/">.
    expect(result.canonicalHref).toBe("https://host.example/");
  });

  it("robotsNoindex is true", () => {
    expect(result.robotsNoindex).toBe(true);
  });

  it("OG tags are all undefined", () => {
    expect(result.ogTitle).toBeUndefined();
    expect(result.ogDescription).toBeUndefined();
    expect(result.ogImage).toBeUndefined();
    expect(result.ogUrl).toBeUndefined();
    expect(result.ogType).toBeUndefined();
    expect(result.ogSiteName).toBeUndefined();
  });

  it("Twitter tags are all undefined", () => {
    expect(result.twitterCard).toBeUndefined();
    expect(result.twitterTitle).toBeUndefined();
    expect(result.twitterDescription).toBeUndefined();
    expect(result.twitterImage).toBeUndefined();
  });

  it("jsonLdScript is null (suppressed for editor)", () => {
    expect(result.jsonLdScript).toBeNull();
  });
});

describe("buildSeoHead — modal layout forces noSharing semantics", () => {
  const result = buildSeoHead({
    title: "Modal Page",
    description: "A modal interaction.",
    noSharing: false, // caller says false, but modal should override
    jsonLd: { "@type": "WebPage" },
    layout: "modal",
    url: BASE_URL,
  });

  it("robotsNoindex is true (modal overrides noSharing=false)", () => {
    expect(result.robotsNoindex).toBe(true);
  });

  it("OG tags are all undefined", () => {
    expect(result.ogTitle).toBeUndefined();
    expect(result.ogDescription).toBeUndefined();
    expect(result.ogImage).toBeUndefined();
    expect(result.ogUrl).toBeUndefined();
    expect(result.ogType).toBeUndefined();
    expect(result.ogSiteName).toBeUndefined();
  });

  it("Twitter tags are all undefined", () => {
    expect(result.twitterCard).toBeUndefined();
    expect(result.twitterTitle).toBeUndefined();
    expect(result.twitterDescription).toBeUndefined();
    expect(result.twitterImage).toBeUndefined();
  });

  it("jsonLdScript is null (suppressed for modal)", () => {
    expect(result.jsonLdScript).toBeNull();
  });
});

describe("buildSeoHead — relative image URL is resolved to absolute", () => {
  const result = buildSeoHead({
    title: "Relative Image Test",
    description: "Testing relative image resolution.",
    image: "/uploads/poster.jpg",
    layout: "view",
    url: new URL("https://host.example/some/path"),
  });

  it("ogImage is 'https://host.example/uploads/poster.jpg'", () => {
    expect(result.ogImage).toBe("https://host.example/uploads/poster.jpg");
  });
});

// ---------------------------------------------------------------------------
// Additional edge-case tests
// ---------------------------------------------------------------------------

describe("buildSeoHead — defaultImage cascade", () => {
  it("uses defaultImage when image is absent", () => {
    const result = buildSeoHead({
      title: "Default Image Test",
      description: "Testing default image.",
      defaultImage: "https://host.example/brand.jpg",
      layout: "view",
      url: BASE_URL,
    });
    expect(result.ogImage).toBe("https://host.example/brand.jpg");
  });

  it("image takes precedence over defaultImage", () => {
    const result = buildSeoHead({
      title: "Image Priority Test",
      description: "Testing image priority.",
      image: "https://host.example/specific.jpg",
      defaultImage: "https://host.example/brand.jpg",
      layout: "view",
      url: BASE_URL,
    });
    expect(result.ogImage).toBe("https://host.example/specific.jpg");
  });

  it("ogImage is undefined when both image and defaultImage are absent", () => {
    const result = buildSeoHead({
      title: "No Image Test",
      description: "No image supplied.",
      layout: "view",
      url: BASE_URL,
    });
    expect(result.ogImage).toBeUndefined();
    expect(result.twitterImage).toBeUndefined();
  });
});

describe("buildSeoHead — siteName absent omits ogSiteName", () => {
  it("ogSiteName is undefined when siteName is not supplied", () => {
    const result = buildSeoHead({
      title: "No Site Name",
      description: "Testing absent siteName.",
      layout: "view",
      url: BASE_URL,
    });
    expect(result.ogSiteName).toBeUndefined();
  });
});

describe("buildSeoHead — jsonLd as array wraps in @graph", () => {
  it("array jsonLd emits @graph even without breadcrumbs", () => {
    const result = buildSeoHead({
      title: "Array JSON-LD",
      description: "Testing array jsonLd.",
      jsonLd: [{ "@type": "Article" }, { "@type": "Organization" }],
      layout: "view",
      url: BASE_URL,
    });
    expect(result.jsonLdScript).not.toBeNull();
    const parsed = JSON.parse(result.jsonLdScript as string);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);
    expect(parsed["@graph"]).toHaveLength(2);
    expect(parsed["@graph"][0]["@type"]).toBe("Article");
    expect(parsed["@graph"][1]["@type"]).toBe("Organization");
  });
});

describe("buildSeoHead — single jsonLd object + breadcrumbs wraps in @graph", () => {
  it("both jsonLd and breadcrumbs appear in a single @graph block", () => {
    const result = buildSeoHead({
      title: "Combined JSON-LD",
      description: "Testing combined jsonLd + breadcrumbs.",
      jsonLd: { "@type": "Article", name: "My Article" },
      breadcrumbs: [{ label: "Home", href: "/" }],
      layout: "view",
      url: new URL("https://host.example/"),
    });
    expect(result.jsonLdScript).not.toBeNull();
    const parsed = JSON.parse(result.jsonLdScript as string);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);
    expect(parsed["@graph"]).toHaveLength(2);
    expect(parsed["@graph"][0]["@type"]).toBe("Article");
    expect(parsed["@graph"][1]["@type"]).toBe("BreadcrumbList");
  });
});

describe("buildSeoHead — generator passes through", () => {
  it("generator is present when supplied", () => {
    const result = buildSeoHead({
      title: "Generator Test",
      description: "Testing generator passthrough.",
      layout: "view",
      url: BASE_URL,
      generator: "Astro v5.1.0",
    });
    expect(result.generator).toBe("Astro v5.1.0");
  });

  it("generator is undefined when not supplied", () => {
    const result = buildSeoHead({
      title: "No Generator",
      description: "No generator.",
      layout: "view",
      url: BASE_URL,
    });
    expect(result.generator).toBeUndefined();
  });
});

describe("buildSeoHead — JSON-LD output escapes `<` to prevent <script> breakout", () => {
  it("a malicious `</script>` substring in a string value is escaped", () => {
    const result = buildSeoHead({
      title: "Escape Test",
      description: "Testing JSON-LD escape.",
      jsonLd: {
        "@type": "Article",
        headline: "abc</script><script>alert(1)</script>def",
      },
      layout: "view",
      url: BASE_URL,
    });
    expect(result.jsonLdScript).not.toBeNull();
    const raw = result.jsonLdScript as string;
    expect(raw).not.toContain("</");
    expect(raw).not.toContain("<script");
    // Round-trip is invariant — the consumer sees the original string.
    const parsed = JSON.parse(raw);
    expect(parsed.headline).toBe("abc</script><script>alert(1)</script>def");
  });

  it("breadcrumb labels containing `<` are escaped", () => {
    const result = buildSeoHead({
      title: "Crumb Escape",
      description: "Testing breadcrumb escape.",
      breadcrumbs: [{ label: "</script>Home", href: "/" }],
      layout: "view",
      url: new URL("https://host.example/"),
    });
    const raw = result.jsonLdScript as string;
    expect(raw).not.toContain("</");
    const parsed = JSON.parse(raw);
    expect(parsed.itemListElement[0].name).toBe("</script>Home");
  });
});
