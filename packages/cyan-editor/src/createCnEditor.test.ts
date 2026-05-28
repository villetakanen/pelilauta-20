import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EditorView } from "@codemirror/view";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCnEditor } from "./createCnEditor";

function makePasteEvent(data: Record<string, string>): ClipboardEvent {
  const ev = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent;
  Object.defineProperty(ev, "clipboardData", {
    value: { getData: (type: string) => data[type] ?? "" },
  });
  return ev;
}

// Verifies: specs/cyan-ds/cyan-editor/spec.md §Factory mounts a working editor
// Verifies: specs/cyan-ds/cyan-editor/spec.md §setValue updates the running editor without rebuilding state
// Verifies: specs/cyan-ds/cyan-editor/spec.md §setValue with current value is a no-op
// Verifies: specs/cyan-ds/cyan-editor/spec.md §destroy disposes the editor

describe("createCnEditor", () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  it("mounts a CodeMirror editor with the initial value", () => {
    const handle = createCnEditor(target, { value: "# hello" });
    expect(handle.getValue()).toBe("# hello");
    expect(target.querySelector(".cm-editor")).not.toBeNull();
    handle.destroy();
  });

  it("setValue updates the doc without rebuilding the view", () => {
    const handle = createCnEditor(target, { value: "a" });
    const viewBefore = handle.view;
    handle.setValue("b");
    expect(handle.getValue()).toBe("b");
    expect(handle.view).toBe(viewBefore);
    handle.destroy();
  });

  it("setValue with the current value is a no-op", () => {
    const onChange = vi.fn();
    const handle = createCnEditor(target, { value: "a", onChange });
    onChange.mockClear();
    handle.setValue("a");
    expect(onChange).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("destroy removes the editor DOM and is safe to call twice", () => {
    const handle = createCnEditor(target, { value: "x" });
    handle.destroy();
    expect(target.querySelector(".cm-editor")).toBeNull();
    expect(() => handle.destroy()).not.toThrow();
    expect(handle.getValue()).toBe("x");
  });

  // Verifies: specs/cyan-ds/cyan-editor/spec.md §Gutter visibility is reconfigurable at runtime
  it("setGutter toggles the line-number gutter at runtime", () => {
    const handle = createCnEditor(target, { value: "a\nb", gutter: false });
    expect(target.querySelector(".cm-gutters")).toBeNull();
    handle.setGutter(true);
    expect(target.querySelector(".cm-gutters")).not.toBeNull();
    handle.setGutter(false);
    expect(target.querySelector(".cm-gutters")).toBeNull();
    handle.destroy();
  });

  // Verifies: specs/cyan-ds/cyan-editor/spec.md §Disabled state is reconfigurable at runtime
  it("setDisabled reconfigures the read-only state at runtime", () => {
    const handle = createCnEditor(target, { value: "a", disabled: false });
    expect(handle.view.state.readOnly).toBe(false);
    handle.setDisabled(true);
    expect(handle.view.state.readOnly).toBe(true);
    handle.setDisabled(false);
    expect(handle.view.state.readOnly).toBe(false);
    handle.destroy();
  });

  // Verifies: specs/cyan-ds/cyan-editor/spec.md §Explicit dark option overrides computed colour scheme
  it("explicit dark option is honoured regardless of computed colour scheme", () => {
    const light = createCnEditor(target, { value: "a", dark: false });
    const dark = createCnEditor(document.body.appendChild(document.createElement("div")), {
      value: "a",
      dark: true,
    });
    expect(light.view.state.facet(EditorView.darkTheme)).toBe(false);
    expect(dark.view.state.facet(EditorView.darkTheme)).toBe(true);
    light.destroy();
    dark.destroy();
  });
});

// Verifies: specs/cyan-ds/cyan-editor/spec.md §Paste of HTML produces markdown
// Verifies: specs/cyan-ds/cyan-editor/spec.md §Plaintext paste passes through
describe("paste handling", () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
  });

  it("converts pasted HTML to markdown and strips scripts", () => {
    const handle = createCnEditor(target, { value: "" });
    handle.focus();
    handle.view.contentDOM.dispatchEvent(
      makePasteEvent({
        "text/html": "<h1>Title</h1><p><strong>bold</strong></p><script>alert(1)</script>",
      }),
    );
    const value = handle.getValue();
    expect(value).toContain("# Title");
    expect(value).toContain("**bold**");
    expect(value).not.toContain("alert(1)");
    handle.destroy();
  });

  it("passes plaintext through verbatim when no HTML is present", () => {
    const handle = createCnEditor(target, { value: "" });
    handle.focus();
    handle.view.contentDOM.dispatchEvent(makePasteEvent({ "text/plain": "raw text" }));
    expect(handle.getValue()).toContain("raw text");
    handle.destroy();
  });
});

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...listSourceFiles(full));
    } else if (
      /\.(ts|css)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

// Verifies: specs/cyan-ds/cyan-editor/spec.md §Module import is SSR-safe
describe("SSR / framework-agnostic source hygiene", () => {
  const sources = listSourceFiles(__dirname).map((f) => ({
    f,
    src: readFileSync(f, "utf8"),
  }));

  it("imports the barrel without throwing", async () => {
    await expect(import("./index")).resolves.toBeDefined();
  });

  it("contains no Lit or custom-element registration anywhere in source", () => {
    for (const { f, src } of sources) {
      expect(src, f).not.toMatch(/from ['"]lit['"]/);
      expect(src, f).not.toMatch(/@customElement/);
      expect(src, f).not.toMatch(/customElements\.define/);
    }
  });

  it("does not read browser globals at module top level", () => {
    // Browser globals are permitted only inside function bodies (e.g. detectDark,
    // the factory). A top-level statement touching document/window/navigator
    // would run at import time and break SSR.
    for (const { f, src } of sources) {
      for (const line of src.split("\n")) {
        const code = line.replace(/\/\/.*$/, "");
        const topLevel = !/^\s/.test(code) && code.trim().length > 0;
        if (topLevel) {
          expect(code, `${f}: top-level browser global`).not.toMatch(
            /\b(document|window|navigator)\b/,
          );
        }
      }
    }
  });
});

// Verifies: specs/cyan-ds/cyan-editor/spec.md §Base cyan bundle stays editor-free
describe("base cyan bundle isolation", () => {
  it("packages/cyan source imports no editor-only dependency", () => {
    const cyanSrc = join(__dirname, "..", "..", "cyan", "src");
    const forbidden = /from ['"](@codemirror\/|@lezer\/|codemirror|turndown|dompurify|lit)/;
    for (const f of listSourceFiles(cyanSrc)) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(forbidden);
    }
  });
});

// Verifies: specs/cyan-ds/cyan-editor/spec.md §No deprecated tokens in theme output
describe("token namespace hygiene", () => {
  it("theme and styles reference only --cn-* custom properties", () => {
    const files = ["cnEditorTheme.ts", "styles.css"].map((f) =>
      readFileSync(join(__dirname, f), "utf8"),
    );
    for (const src of files) {
      expect(src).not.toMatch(/--color-/);
      expect(src).not.toMatch(/--chroma-/);
      expect(src).not.toMatch(/--background-editor/);
      const customProps = src.match(/--[a-z][\w-]*/g) ?? [];
      for (const prop of customProps) {
        expect(prop.startsWith("--cn-")).toBe(true);
      }
    }
  });
});
