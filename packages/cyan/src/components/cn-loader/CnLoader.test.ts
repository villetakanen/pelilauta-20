import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CnLoader from "./CnLoader.svelte";

describe("CnLoader", () => {
  it("renders a span with the .cn-loader class", () => {
    const { container } = render(CnLoader);
    const element = container.querySelector(".cn-loader");
    expect(element).not.toBeNull();
  });

  it("renders the lds-dual-ring element inside", () => {
    const { container } = render(CnLoader);
    const ring = container.querySelector(".lds-dual-ring");
    expect(ring).not.toBeNull();
  });

  it("renders the CnIcon with the default 'fox' noun", () => {
    const { container } = render(CnLoader);
    const icon = container.querySelector('.cn-icon[data-noun="fox"]');
    expect(icon).not.toBeNull();
  });

  it("renders the CnIcon with a custom noun", () => {
    const { container } = render(CnLoader, { props: { noun: "cat" } });
    const icon = container.querySelector('.cn-icon[data-noun="cat"]');
    expect(icon).not.toBeNull();
  });

  it("sizes the nested CnIcon to --cn-icon-size-large in the default variant", () => {
    const { container } = render(CnLoader);
    const icon = container.querySelector(".cn-icon") as HTMLElement;
    const dim = icon.style.getPropertyValue("--icon-dim");
    expect(dim).toBe("var(--cn-icon-size-large)");
  });

  it("sizes the nested CnIcon to --cn-icon-size-small in the inline variant", () => {
    const { container } = render(CnLoader, { props: { inline: true } });
    const icon = container.querySelector(".cn-icon") as HTMLElement;
    const dim = icon.style.getPropertyValue("--icon-dim");
    expect(dim).toBe("var(--cn-icon-size-small)");
  });

  it("adds the .cn-loader-inline class when inline", () => {
    const { container } = render(CnLoader, { props: { inline: true } });
    const element = container.querySelector(".cn-loader");
    expect(element?.classList.contains("cn-loader-inline")).toBe(true);
  });

  it("has role='status' and default aria-label", () => {
    const { container } = render(CnLoader);
    const element = container.querySelector(".cn-loader");
    expect(element?.getAttribute("role")).toBe("status");
    expect(element?.getAttribute("aria-label")).toBe("Loading");
  });

  it("updates aria-label when label prop is provided", () => {
    const { container } = render(CnLoader, { props: { label: "Processing\u2026" } });
    const element = container.querySelector(".cn-loader");
    expect(element?.getAttribute("aria-label")).toBe("Processing\u2026");
  });
});
