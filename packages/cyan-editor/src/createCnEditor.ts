import { Compartment, EditorState } from "@codemirror/state";
import { placeholder as cmPlaceholder, EditorView, lineNumbers } from "@codemirror/view";

import { createEditorState } from "./cnEditorConfig";

export interface CnEditorOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  gutter?: boolean;
  /** Force dark/light theme. If omitted, resolved from target's computed colour scheme. */
  dark?: boolean;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
}

export interface CnEditorHandle {
  readonly view: EditorView;
  getValue(): string;
  setValue(next: string): void;
  setPlaceholder(next: string): void;
  setDisabled(next: boolean): void;
  setGutter(next: boolean): void;
  focus(): void;
  select(): void;
  insertText(text: string): void;
  /** Returns the currently selected text in the primary selection, or "" if none. */
  getSelection(): string;
  destroy(): void;
}

function detectDark(target: HTMLElement, override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  if (typeof window === "undefined") return false;
  const scheme = window.getComputedStyle(target).getPropertyValue("color-scheme").trim();
  if (scheme.includes("dark") && !scheme.includes("light")) return true;
  if (scheme === "dark") return true;
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function createCnEditor(target: HTMLElement, options: CnEditorOptions = {}): CnEditorHandle {
  if (typeof window === "undefined") {
    throw new Error("[cyan-editor] createCnEditor must be called in a browser context");
  }

  const placeholderCompartment = new Compartment();
  const disabledCompartment = new Compartment();
  const gutterCompartment = new Compartment();

  let currentValue = options.value ?? "";
  let destroyed = false;
  let valueOnFocus = currentValue;

  const syncDisabledAttr = (disabled: boolean) => {
    if (disabled) target.setAttribute("aria-disabled", "true");
    else target.removeAttribute("aria-disabled");
  };
  syncDisabledAttr(options.disabled ?? false);

  const state = createEditorState({
    initialDoc: currentValue,
    initialPlaceholder: options.placeholder ?? "",
    initialDisabled: options.disabled ?? false,
    initialGutter: options.gutter ?? false,
    isDark: detectDark(target, options.dark),
    placeholderCompartment,
    disabledCompartment,
    gutterCompartment,
    callbacks: {
      onDocChanged: (doc) => {
        currentValue = doc;
        options.onChange?.(doc);
      },
      onFocus: (_event, view) => {
        valueOnFocus = view.state.doc.toString();
      },
    },
  });

  const view = new EditorView({
    state,
    parent: target,
  });

  const handleBlur = () => {
    if (destroyed) return;
    if (valueOnFocus !== currentValue) {
      options.onBlur?.(currentValue);
    }
  };
  view.contentDOM.addEventListener("blur", handleBlur);

  const handle: CnEditorHandle = {
    get view() {
      return view;
    },
    getValue() {
      return currentValue;
    },
    setValue(next) {
      if (destroyed) return;
      if (next === currentValue) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      });
    },
    setPlaceholder(next) {
      if (destroyed) return;
      view.dispatch({
        effects: placeholderCompartment.reconfigure(cmPlaceholder(next)),
      });
    },
    setDisabled(next) {
      if (destroyed) return;
      view.dispatch({
        effects: disabledCompartment.reconfigure(EditorState.readOnly.of(next)),
      });
      syncDisabledAttr(next);
    },
    setGutter(next) {
      if (destroyed) return;
      view.dispatch({
        effects: gutterCompartment.reconfigure(next ? lineNumbers() : []),
      });
    },
    focus() {
      if (destroyed) return;
      view.focus();
    },
    select() {
      if (destroyed) return;
      view.dispatch({
        selection: { anchor: 0, head: view.state.doc.length },
        scrollIntoView: true,
      });
      view.focus();
    },
    insertText(text) {
      if (destroyed) return;
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    getSelection() {
      if (destroyed) return "";
      const range = view.state.selection.main;
      if (range.empty) return "";
      return view.state.sliceDoc(range.from, range.to);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      view.contentDOM.removeEventListener("blur", handleBlur);
      view.destroy();
    },
  };

  return handle;
}
