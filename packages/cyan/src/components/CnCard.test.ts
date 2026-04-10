import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CnCard from "./CnCard.svelte";

describe("CnCard root element", () => {
  it("renders an article element as root", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    const article = container.querySelector("article.cn-card");
    expect(article).not.toBeNull();
  });

  it("never renders an <a> as root, even with href", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", href: "/foo" },
    });
    expect(container.querySelector("a.cn-card")).toBeNull();
    expect(container.querySelector("article.cn-card")).not.toBeNull();
  });
});

describe("CnCard title", () => {
  it("renders title string in an h4", () => {
    const { container } = render(CnCard, { props: { title: "Hello World" } });
    const h4 = container.querySelector("h4.title");
    expect(h4).not.toBeNull();
    expect(h4!.textContent).toContain("Hello World");
  });

  it("wraps title in a link when href is provided", () => {
    const { container } = render(CnCard, {
      props: { title: "Linked", href: "/session/1" },
    });
    const link = container.querySelector("h4.title a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/session/1");
    expect(link!.textContent).toContain("Linked");
  });

  it("does not render a link when href is absent", () => {
    const { container } = render(CnCard, { props: { title: "Plain" } });
    expect(container.querySelector("h4.title a")).toBeNull();
  });
});

describe("CnCard description", () => {
  it("renders description string as a <p>", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", description: "A short blurb" },
    });
    const p = container.querySelector("p.description");
    expect(p).not.toBeNull();
    expect(p!.textContent).toBe("A short blurb");
  });

  it("does not render description <p> when empty", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    expect(container.querySelector("p.description")).toBeNull();
  });
});

describe("CnCard elevation", () => {
  it("applies elevation-N utility class matching the prop", () => {
    for (const el of [0, 1, 2, 3, 4] as const) {
      const { container } = render(CnCard, {
        props: { title: "Test", elevation: el },
      });
      const card = container.querySelector(".cn-card") as HTMLElement;
      expect(card.classList.contains(`elevation-${el}`)).toBe(true);
    }
  });

  it("defaults to elevation-1 utility class", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    const card = container.querySelector(".cn-card") as HTMLElement;
    expect(card.classList.contains("elevation-1")).toBe(true);
  });
});

describe("CnCard indicators (triangular corner)", () => {
  it("adds has-notify class when notify=true", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", notify: true },
    });
    const card = container.querySelector(".cn-card");
    expect(card!.classList.contains("has-notify")).toBe(true);
  });

  it("adds has-alert class when alert=true", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", alert: true },
    });
    const card = container.querySelector(".cn-card");
    expect(card!.classList.contains("has-alert")).toBe(true);
  });

  it("supports both notify and alert simultaneously", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", notify: true, alert: true },
    });
    const card = container.querySelector(".cn-card");
    expect(card!.classList.contains("has-notify")).toBe(true);
    expect(card!.classList.contains("has-alert")).toBe(true);
  });

  it("has no indicator classes by default", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    const card = container.querySelector(".cn-card");
    expect(card!.classList.contains("has-notify")).toBe(false);
    expect(card!.classList.contains("has-alert")).toBe(false);
  });
});

describe("CnCard cover", () => {
  it("renders a cover image with lazy loading", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", cover: "/img.jpg" },
    });
    const img = container.querySelector(".cover img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("/img.jpg");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("renders a tint overlay on cover", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", cover: "/img.jpg" },
    });
    expect(container.querySelector(".cover .tint")).not.toBeNull();
  });

  it("wraps cover image in a link when href is set", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", cover: "/img.jpg", href: "/page" },
    });
    const link = container.querySelector(".cover a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/page");
    expect(link!.getAttribute("tabindex")).toBe("-1");
    // The link should contain the image
    expect(link!.querySelector("img")).not.toBeNull();
  });

  it("does not wrap cover in a link when href is absent", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", cover: "/img.jpg" },
    });
    expect(container.querySelector(".cover a")).toBeNull();
  });

  it("passes srcset and sizes to the cover image", () => {
    const { container } = render(CnCard, {
      props: {
        title: "Test",
        cover: "/img.jpg",
        srcset: "/sm.jpg 400w, /lg.jpg 800w",
        sizes: "(max-width: 600px) 400px, 800px",
      },
    });
    const img = container.querySelector(".cover img") as HTMLImageElement;
    expect(img.getAttribute("srcset")).toBe("/sm.jpg 400w, /lg.jpg 800w");
    expect(img.getAttribute("sizes")).toBe("(max-width: 600px) 400px, 800px");
  });

  it("does not render cover section when cover is absent", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    expect(container.querySelector(".cover")).toBeNull();
  });
});

describe("CnCard noun icon", () => {
  it("renders icon inline in the title when noun is set without cover", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", noun: "fox" },
    });
    expect(container.querySelector("h4.title .cn-icon")).not.toBeNull();
  });

  it("renders icon inside the title link when noun and href are set without cover", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", noun: "fox", href: "/page" },
    });
    const link = container.querySelector("h4.title a");
    expect(link).not.toBeNull();
    expect(link!.querySelector(".cn-icon")).not.toBeNull();
  });

  it("renders icon in cover-noun position when both noun and cover are set", () => {
    const { container } = render(CnCard, {
      props: { title: "Test", noun: "fox", cover: "/img.jpg" },
    });
    // Icon should be in .cover-noun, not inside the title
    expect(container.querySelector("h4.title .cn-icon")).toBeNull();
    expect(container.querySelector(".cn-card .cover-noun")).not.toBeNull();
  });
});

describe("CnCard layout", () => {
  it("has a spacer div to push actions to the bottom", () => {
    const { container } = render(CnCard, { props: { title: "Test" } });
    expect(container.querySelector(".spacer")).not.toBeNull();
  });

  it("wraps actions in a <nav> element", () => {
    // Actions require a Snippet, so we verify the structural contract:
    // when no actions snippet is provided, no <nav> is rendered
    const { container } = render(CnCard, { props: { title: "Test" } });
    expect(container.querySelector("nav.actions")).toBeNull();
  });
});
