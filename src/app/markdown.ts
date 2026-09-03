import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { NoteMeta, VaultFile } from './types';

const CALLOUT_RE = /^\[!([a-zA-Z]+)\]([+-]?)(?:\s+(.*))?$/;

function remarkCallouts() {
	return (tree: unknown) => {
		visit(tree as never, 'blockquote', (node: {
			children: Array<{
				type: string;
				children?: Array<{ type: string; value?: string }>;
			}>;
			data?: { hName?: string; hProperties?: Record<string, unknown> };
		}) => {
			const first = node.children[0];
			if (!first || first.type !== 'paragraph' || !first.children?.length) return;
			const firstChild = first.children[0];
			if (firstChild?.type !== 'text' || !firstChild.value) return;

			const line = firstChild.value.split('\n')[0] ?? '';
			const match = CALLOUT_RE.exec(line.trim());
			if (!match) return;

			const type = match[1].toLowerCase();
			const title = (match[3] || type).trim();
			const rest = firstChild.value.split('\n').slice(1).join('\n');
			if (rest) firstChild.value = rest;
			else first.children.splice(0, 1);
			if (first.children.length === 0) node.children.shift();

			node.data = {
				hName: 'aside',
				hProperties: { className: ['callout', `callout-${type}`], 'data-title': title },
			};
		});
	};
}

export function parseFrontmatter(body: string): {
	title?: string;
	tags: string[];
	course?: string;
	content: string;
} {
	if (!body.startsWith('---')) return { tags: [], content: body };
	const end = body.indexOf('\n---', 3);
	if (end === -1) return { tags: [], content: body };
	const raw = body.slice(4, end);
	const content = body.slice(end + 4).replace(/^\r?\n/, '');
	const data: Record<string, string> = {};
	for (const line of raw.split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	const tagRaw = data.tags ?? '';
	const tags = tagRaw
		.replace(/^\[/, '')
		.replace(/\]$/, '')
		.split(',')
		.map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
		.filter(Boolean);
	return {
		title: data.title?.replace(/^['"]|['"]$/g, '') || undefined,
		tags,
		course: data.course?.replace(/^['"]|['"]$/g, '') || undefined,
		content,
	};
}

export function deriveTitle(body: string, fallback = 'Untitled'): string {
	const fm = parseFrontmatter(body);
	if (fm.title?.trim()) return fm.title.trim();
	const heading = fm.content.match(/^#\s+(.+)$/m);
	if (heading?.[1]) return heading[1].trim();
	return fallback;
}

export function extractOutline(body: string): Array<{ level: number; text: string; id: string }> {
	const { content } = parseFrontmatter(body);
	const outline: Array<{ level: number; text: string; id: string }> = [];
	let inFence = false;
	for (const line of content.split('\n')) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const match = /^(#{1,6})\s+(.+)$/.exec(line);
		if (!match) continue;
		const text = match[2].trim();
		outline.push({
			level: match[1].length,
			text,
			id: slugify(text),
		});
	}
	return outline;
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

function resolveWiki(source: string, notes: NoteMeta[], files: VaultFile[]): string {
	let text = source;
	text = text.replace(/!\[\[([^\]]+)\]\]/g, (_, raw: string) => {
		const name = String(raw).split('|')[0]!.trim();
		const file = files.find(
			(f) => f.name === name || f.name.toLowerCase() === name.toLowerCase(),
		);
		if (!file) return `*[missing: ${name}]*`;
		return `[${file.name}](vault-embed://${file.id})`;
	});
	text = text.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
		const [target, alias] = String(raw).split('|');
		const title = target!.split('#')[0]!.trim();
		const label = (alias ?? title).trim();
		const note = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
		if (!note) return `[${label}](vault-missing://${encodeURIComponent(title)})`;
		return `[${label}](vault-note://${note.id})`;
	});
	return text;
}

function hydrateMedia(html: string, files: VaultFile[]): string {
	return html.replace(
		/<a href="(vault-(?:embed|note|missing):\/\/[^"]+)">([^<]*)<\/a>/g,
		(_, href: string, label: string) => {
			if (href.startsWith('vault-note://')) {
				const id = href.replace('vault-note://', '');
				return `<a class="wiki-link" href="#note:${id}">${label}</a>`;
			}
			if (href.startsWith('vault-missing://')) {
				return `<span class="wiki-missing">${label}</span>`;
			}
			const id = href.replace('vault-embed://', '');
			const file = files.find((f) => f.id === id);
			if (!file) return `<span class="wiki-missing">${label}</span>`;
			const src = `/api/files/${file.id}/content`;
			if (file.mime.startsWith('image/')) {
				return `<img src="${src}" alt="${escapeAttr(file.name)}" />`;
			}
			if (file.mime.startsWith('video/')) {
				return `<video controls preload="metadata" src="${src}"></video>`;
			}
			if (file.mime.startsWith('audio/')) {
				return `<audio controls src="${src}"></audio>`;
			}
			if (file.mime === 'application/pdf') {
				return `<iframe class="pdf-frame" title="${escapeAttr(file.name)}" src="${src}"></iframe>`;
			}
			return `<a href="${src}" target="_blank" rel="noreferrer">${escapeAttr(file.name)}</a>`;
		},
	);
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function headingIds() {
	return (tree: unknown) => {
		visit(tree as never, 'element', (node: {
			tagName?: string;
			properties?: Record<string, unknown>;
			children?: Array<{ type: string; value?: string }>;
		}) => {
			if (!node.tagName || !/^h[1-6]$/.test(node.tagName)) return;
			const text = (node.children ?? [])
				.filter((c) => c.type === 'text')
				.map((c) => c.value ?? '')
				.join(' ');
			node.properties = { ...node.properties, id: slugify(text) };
		});
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkCallouts)
	.use(remarkRehype)
	.use(rehypeKatex)
	.use(rehypeHighlight)
	.use(headingIds)
	.use(rehypeStringify);

export async function renderMarkdown(
	body: string,
	notes: NoteMeta[],
	files: VaultFile[],
): Promise<string> {
	const { content } = parseFrontmatter(body);
	const prepared = resolveWiki(content, notes, files);
	const html = String(await processor.process(prepared));
	return hydrateMedia(html, files);
}
