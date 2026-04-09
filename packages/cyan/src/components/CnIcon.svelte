<script lang="ts">
import { getIcon as getManagedIcon } from "@myrrys/proprietary";
import { getIcon as getCommunityIcon } from "@pelilauta/icons";
import { FallbackIcons } from "./CnIconFallback";

let { noun, size = "medium" } = $props<{
  noun: string;
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge";
}>();

// Resolution Logic (Tiered: Community -> Managed -> Fallback)
let content = $derived.by(() => {
  // 1. Community (Pelilauta) - T1 Priority as per Spec
  const communityContent = getCommunityIcon(noun);
  if (communityContent) return communityContent;

  // 2. Managed (Myrrys) - T2
  const managedContent = getManagedIcon(noun);
  if (managedContent) return managedContent;

  // 3. Fallback Registry - T3
  if (FallbackIcons[noun]) {
    return FallbackIcons[noun].paths
      .map((p) => {
        const fill = p.fill || "currentColor";
        const opacity = p.opacity !== undefined ? ` fill-opacity="${p.opacity}"` : "";
        return `<path d="${p.d}" fill="${fill}"${opacity} />`;
      })
      .join("");
  }

  // 4. Missing Glyph
  return FallbackIcons.missing.paths.map((p) => `<path d="${p.d}" fill="currentColor" />`).join("");
});

let viewBox = $derived.by(() => {
  // For raw SVGs, we need to extract the viewBox.
  // Community first, matching content resolution order.
  const rawSvg = getCommunityIcon(noun) || getManagedIcon(noun);

  if (rawSvg) {
    // Improved regex: handles single/double quotes and optional whitespace
    const match = rawSvg.match(/viewBox\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : "0 0 128 128"; // Default registry viewBox
  }

  return FallbackIcons[noun]?.viewBox || FallbackIcons.missing.viewBox || "0 0 24 24";
});

// Clean the content if it's a raw SVG
let innerHtml = $derived.by(() => {
  if (content.includes("<svg")) {
    return content
      .replace(/<\?xml[^>]*\?>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<svg[^>]*>/i, "")
      .replace(/<\/svg>/i, "");
  }
  return content;
});

const sizes: Record<string, string> = {
  xsmall: "var(--cn-icon-size-xsmall)",
  small: "var(--cn-icon-size-small)",
  medium: "var(--cn-icon-size)",
  large: "var(--cn-icon-size-large)",
  xlarge: "var(--cn-icon-size-xlarge)",
};
const calculatedSize = $derived(sizes[size as keyof typeof sizes] || sizes.medium);
</script>

<span class="cn-icon" data-noun={noun} style="--icon-dim: {calculatedSize};">
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox={viewBox} 
    aria-hidden="true"
  >
    {@html innerHtml}
  </svg>
</span>

<style>
  .cn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-dim);
    height: var(--icon-dim);
    aspect-ratio: 1/1;
    overflow: hidden;
    vertical-align: middle;
  }
  .cn-icon svg {
    width: 100%;
    height: 100%;
  }
</style>
