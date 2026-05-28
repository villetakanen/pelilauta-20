import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  standardKeymap,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { type Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  placeholder as cmPlaceholder,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";

import { buildEditorTheme, cnMarkdownHighlightStyle } from "./cnEditorTheme";
import { pasteHtmlAsMarkdown } from "./cnPasteHandler";

export interface EditorCallbacks {
  onDocChanged: (newDoc: string) => void;
  onFocus?: (event: FocusEvent, view: EditorView) => void;
}

export interface CreateStateArgs {
  initialDoc: string;
  initialPlaceholder: string;
  initialDisabled: boolean;
  initialGutter: boolean;
  isDark: boolean;
  placeholderCompartment: Compartment;
  disabledCompartment: Compartment;
  gutterCompartment: Compartment;
  callbacks: EditorCallbacks;
}

export function createEditorState(args: CreateStateArgs): EditorState {
  const allKeymaps = keymap.of([
    ...standardKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,
  ]);

  const extensions: Extension[] = [
    EditorView.lineWrapping,
    allKeymaps,
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    highlightSpecialChars(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
    }),

    args.placeholderCompartment.of(cmPlaceholder(args.initialPlaceholder)),
    args.disabledCompartment.of(EditorState.readOnly.of(args.initialDisabled)),
    args.gutterCompartment.of(args.initialGutter ? lineNumbers() : []),

    pasteHtmlAsMarkdown(),
    syntaxHighlighting(cnMarkdownHighlightStyle, { fallback: true }),

    buildEditorTheme(args.isDark),

    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        args.callbacks.onDocChanged(update.state.doc.toString());
      }
    }),
    args.callbacks.onFocus ? EditorView.domEventHandlers({ focus: args.callbacks.onFocus }) : [],
  ];

  return EditorState.create({
    doc: args.initialDoc,
    extensions,
  });
}
