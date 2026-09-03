export const WELCOME_BODY = `---
title: Welcome
tags: [meta, getting-started]
course:
---

# Welcome

This vault is built for **academic notes**: lectures, proofs, papers, and course dumps — not shopping lists.

## Writing

- \`Cmd/Ctrl+K\` opens the command palette
- \`Cmd/Ctrl+S\` saves immediately (autosave already runs ~2s after you stop typing)
- \`Cmd/Ctrl+\\\\\` toggles the sidebar
- \`Cmd/Ctrl+Shift+V\` cycles edit / split / reading mode

## Markdown

GFM tables, footnotes, task lists, and fenced code all work.

| Object | Lives in | Why |
| --- | --- | --- |
| Notes | D1 | Search, folders, cheap text writes |
| Files / video | R2 | Blobs and lecture recordings |

Wikilink to other notes with \`[[Welcome]]\`. Tag with \`#linear-algebra\`.

> [!note] Callouts
> Obsidian-style callouts work: note, tip, warning, important, danger, theorem, definition, lemma, proof, example.

> [!theorem] Euler's identity
> The relation $e^{i\\pi} + 1 = 0$ links five constants.

Display math:

$$
\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)
$$

Inline math like $\\nabla \\cdot \\mathbf{B} = 0$ is fine in a sentence.

## Files

Drop PDFs, images, or lecture videos onto a note (or use **Upload** in the sidebar). Videos play in the right pane — they stream from R2 via a short-lived API, not through every page load.

## Sync

Edits save locally first, then sync to the cloud so a laptop and phone stay in range without burning the free-plan write budget. Last write wins if you edit the same note on two devices at once.

Start a folder per course and go.
`;
