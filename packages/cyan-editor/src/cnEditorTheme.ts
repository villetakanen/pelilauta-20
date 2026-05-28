import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// Theme is built lazily so module evaluation stays free of DOM reads.
// `isDark` is resolved by the factory at construction time, not at import time.
export function buildEditorTheme(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        width: "100%",
        height: "100%",
        margin: "0",
        boxSizing: "border-box",

        background: "var(--cn-input)",
        color: "var(--cn-on-input)",

        border: "none",
        borderBottom: "1px solid var(--cn-border)",
        borderRadius: "var(--cn-border-radius-field, 0 1rem 0 0)",
        outline: "none",

        fontFamily: "var(--cn-font-family)",
        fontSize: "var(--cn-font-size-text)",
        lineHeight: "var(--cn-line-height-text)",

        transition: "background 0.2s ease, border-bottom-color 0.2s ease",
      },

      "&:hover:not(.cm-focused)": {
        background: "var(--cn-input-hover)",
        borderBottomColor: "var(--cn-border-hover)",
      },

      "&.cm-focused": {
        background: "var(--cn-input-focus)",
        borderBottomColor: "var(--cn-border-focus)",
        outline: "none",
      },

      ".cm-scroller": {
        fontFamily: "inherit",
        lineHeight: "var(--cn-line-height-text)",
      },

      ".cm-content": {
        padding: "var(--cn-gap)",
        color: "var(--cn-on-input)",
        caretColor: "var(--cn-border-focus)",
      },

      "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--cn-border-focus)",
        borderLeftWidth: "2px",
      },

      ".cm-placeholder": {
        color: "var(--cn-text-low)",
        opacity: "0.75",
      },

      ".cm-selectionBackground, & ::selection": {
        background: "var(--cn-selection) !important",
        color: "var(--cn-on-selection)",
      },

      ".cm-activeLine": {
        backgroundColor: "transparent",
      },

      ".cm-gutters": {
        minWidth: "calc(2 * var(--cn-gap))",
        backgroundColor: "var(--cn-surface-2)",
        color: "var(--cn-text-low)",
        borderRight: "1px solid var(--cn-border)",
      },

      ".cm-activeLineGutter": {
        backgroundColor: "var(--cn-surface-3)",
      },
    },
    { dark: isDark },
  );
}

export const cnMarkdownHighlightStyle = HighlightStyle.define([
  {
    tag: t.heading1,
    fontSize: "var(--cn-font-size-h1)",
    fontWeight: "var(--cn-font-weight-h1)",
    lineHeight: "var(--cn-line-height-h1)",
    color: "var(--cn-text-heading)",
  },
  {
    tag: t.heading2,
    fontSize: "var(--cn-font-size-h2)",
    fontWeight: "var(--cn-font-weight-h2)",
    lineHeight: "var(--cn-line-height-h2)",
    color: "var(--cn-text-heading)",
  },
  {
    tag: t.heading3,
    fontSize: "var(--cn-font-size-h3)",
    fontWeight: "var(--cn-font-weight-h3)",
    lineHeight: "var(--cn-line-height-h3)",
    color: "var(--cn-text-subheading)",
  },
  {
    tag: t.heading4,
    fontSize: "var(--cn-font-size-h4)",
    fontWeight: "var(--cn-font-weight-h4)",
    lineHeight: "var(--cn-line-height-h4)",
    color: "var(--cn-text-subheading)",
  },
  {
    tag: t.strong,
    fontWeight: "var(--cn-font-weight-text-strong)",
    color: "var(--cn-text-high)",
  },
  {
    tag: t.emphasis,
    fontStyle: "italic",
    color: "var(--cn-text)",
  },
  {
    tag: t.link,
    textDecoration: "underline",
    color: "var(--cn-link)",
  },
  {
    tag: t.monospace,
    color: "var(--cn-text-high)",
    backgroundColor: "var(--cn-surface-2)",
    fontFamily: "var(--cn-font-family-mono)",
  },
  {
    tag: t.quote,
    class: "cm-quote",
    color: "var(--cn-text-low)",
  },
]);
