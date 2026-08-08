import { htmlToBlocks } from '@portabletext/block-tools';
import { marked } from 'marked';
import { PortableTextInput, type PortableTextInputProps } from 'sanity';
import type { TypedObject } from '@sanity/types';

// ChatGPT's own "Copy" button (the icon under a response) copies the raw
// Markdown source as plain text, with no HTML on the clipboard — Sanity's
// built-in paste handling only deserializes HTML, so that paste lands as
// one literal paragraph full of "##" and "**" characters. Manually
// selecting the rendered response and copying *does* carry real HTML and
// already pastes correctly via Sanity's default behavior, so this only
// steps in for the plain-text/Markdown case.
const MARKDOWN_HINT = /^#{1,6}\s|\*\*[^*\n]+\*\*|^\s*[-*+]\s|^\s*\d+\.\s|\[[^\]]+\]\([^)]+\)/m;

export function MarkdownPasteInput(props: PortableTextInputProps) {
  return (
    <PortableTextInput
      {...props}
      onPaste={({ event, schemaTypes }) => {
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain');
        if (html || !text || !MARKDOWN_HINT.test(text)) return undefined;

        const asHtml = marked.parse(text, { async: false }) as string;
        const blocks = htmlToBlocks(asHtml, schemaTypes.portableText, {
          parseHtml: (parsable) => new DOMParser().parseFromString(parsable, 'text/html'),
        });
        // block-tools ships its own structurally-identical TypedObject from a
        // separate @sanity/types copy, which TS treats as a different type
        // than `sanity`'s — the blocks themselves are ordinary portable text
        // objects at runtime.
        return { insert: blocks as unknown as TypedObject[], path: [] };
      }}
    />
  );
}
