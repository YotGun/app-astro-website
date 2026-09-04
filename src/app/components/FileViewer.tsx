import { useEffect, useMemo, useRef, useState } from 'react';
import { fileContentUrl } from '../api';
import { extOf, fileKind, formatBytes, formatDate } from '../format';
import { useVault } from '../VaultProvider';
import type { VaultFile } from '../types';
import { IconChevron, IconClose, IconDownload, kindIcon } from './Icons';

/** Anything larger is offered as a download instead of being pulled into memory. */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

const TEXT_EXTS = new Set([
	'txt', 'md', 'markdown', 'json', 'jsonl', 'csv', 'tsv', 'log', 'yml', 'yaml',
	'xml', 'svg', 'html', 'htm', 'css', 'scss', 'js', 'jsx', 'mjs', 'cjs', 'ts',
	'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'c', 'h', 'cpp', 'hpp', 'cs',
	'php', 'sh', 'bash', 'zsh', 'sql', 'toml', 'ini', 'cfg', 'conf', 'env',
	'gitignore', 'lock', 'srt', 'vtt', 'tex', 'bib',
]);

const TEXT_MIMES = [
	'application/json',
	'application/xml',
	'application/javascript',
	'application/x-yaml',
	'application/sql',
	'application/x-sh',
];

function isTextual(file: VaultFile): boolean {
	if (file.mime.startsWith('text/')) return true;
	if (TEXT_MIMES.some((m) => file.mime.startsWith(m))) return true;
	return TEXT_EXTS.has(extOf(file.name));
}

/** Splits a CSV/TSV row, honouring "" quoting. */
function splitRow(line: string, delimiter: string): string[] {
	const cells: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (quoted) {
			if (char === '"' && line[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (char === '"') quoted = false;
			else cell += char;
		} else if (char === '"') quoted = true;
		else if (char === delimiter) {
			cells.push(cell);
			cell = '';
		} else cell += char;
	}
	cells.push(cell);
	return cells;
}

export function FileViewer() {
	const { files, previewFileId, openPreview } = useVault();
	const file = files.find((f) => f.id === previewFileId) ?? null;

	// Arrow keys walk the folder the file lives in, like Drive's viewer.
	const siblings = useMemo(() => {
		if (!file) return [] as VaultFile[];
		return files
			.filter((f) => f.folder_id === file.folder_id)
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [file, files]);
	const index = file ? siblings.findIndex((f) => f.id === file.id) : -1;

	useEffect(() => {
		if (!file) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				openPreview(null);
			} else if (event.key === 'ArrowLeft' && index > 0) {
				openPreview(siblings[index - 1]!.id);
			} else if (event.key === 'ArrowRight' && index >= 0 && index < siblings.length - 1) {
				openPreview(siblings[index + 1]!.id);
			}
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [file, index, openPreview, siblings]);

	if (!file) return null;

	return (
		<div
			className="viewer-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label={file.name}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) openPreview(null);
			}}
		>
			<header className="viewer-bar">
				<span className="viewer-title" title={file.name}>
					{file.name}
				</span>
				<span className="viewer-sub">
					{formatBytes(file.size)} · {file.mime || 'unknown type'}
				</span>
				<div className="viewer-tools">
					<a className="icon-btn" href={fileContentUrl(file.id, true)} title="Download">
						<IconDownload />
					</a>
					<button
						type="button"
						className="icon-btn"
						title="Close (Esc)"
						onClick={() => openPreview(null)}
					>
						<IconClose />
					</button>
				</div>
			</header>
			{index > 0 && (
				<button
					type="button"
					className="viewer-nav prev"
					aria-label="Previous file"
					onClick={() => openPreview(siblings[index - 1]!.id)}
				>
					<IconChevron />
				</button>
			)}
			{index >= 0 && index < siblings.length - 1 && (
				<button
					type="button"
					className="viewer-nav next"
					aria-label="Next file"
					onClick={() => openPreview(siblings[index + 1]!.id)}
				>
					<IconChevron />
				</button>
			)}
			<div className="viewer-stage">
				<ViewerBody file={file} />
			</div>
			<footer className="viewer-foot">
				<span>{formatDate(file.updated_at || file.created_at)}</span>
				{siblings.length > 1 && (
					<span>
						{index + 1} of {siblings.length}
					</span>
				)}
			</footer>
		</div>
	);
}

function ViewerBody({ file }: { file: VaultFile }) {
	const kind = fileKind(file.mime, file.name);
	const src = fileContentUrl(file.id);

	if (kind === 'image') return <img className="viewer-image" src={src} alt={file.name} />;
	if (kind === 'video') {
		return <video className="viewer-video" src={src} controls autoPlay preload="metadata" />;
	}
	if (kind === 'audio') {
		return (
			<div className="viewer-audio">
				<Glyph file={file} />
				<audio src={src} controls preload="metadata" />
			</div>
		);
	}
	if (kind === 'pdf') return <iframe className="viewer-pdf" title={file.name} src={src} />;
	if (isTextual(file)) return <TextBody file={file} />;
	return <Unsupported file={file} />;
}

function TextBody({ file }: { file: VaultFile }) {
	const [text, setText] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);
	const requested = useRef<string | null>(null);

	useEffect(() => {
		if (file.size > MAX_TEXT_BYTES) return;
		if (requested.current === file.id) return;
		requested.current = file.id;
		const controller = new AbortController();
		setText(null);
		setFailed(false);
		fetch(fileContentUrl(file.id), { signal: controller.signal })
			.then((response) => {
				if (!response.ok) throw new Error(response.statusText);
				return response.text();
			})
			.then(setText)
			.catch((cause: unknown) => {
				if ((cause as Error).name !== 'AbortError') setFailed(true);
			});
		return () => controller.abort();
	}, [file.id, file.size]);

	if (file.size > MAX_TEXT_BYTES) return <Unsupported file={file} reason="This file is too large to preview." />;
	if (failed) return <Unsupported file={file} reason="This file could not be loaded." />;
	if (text === null) return <p className="viewer-status muted">Loading preview…</p>;

	const ext = extOf(file.name);
	if (ext === 'csv' || ext === 'tsv') return <Sheet text={text} delimiter={ext === 'csv' ? ',' : '\t'} />;

	let body = text;
	if (ext === 'json' || file.mime.startsWith('application/json')) {
		try {
			body = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			/* leave malformed JSON exactly as stored */
		}
	}
	return <pre className="viewer-text">{body}</pre>;
}

function Sheet({ text, delimiter }: { text: string; delimiter: string }) {
	const rows = useMemo(
		() =>
			text
				.split(/\r?\n/)
				.filter((line) => line.length)
				.slice(0, 500)
				.map((line) => splitRow(line, delimiter)),
		[delimiter, text],
	);
	if (!rows.length) return <p className="viewer-status muted">This file is empty.</p>;
	const [head, ...body] = rows;

	return (
		<div className="viewer-sheet">
			<table>
				<thead>
					<tr>
						{head!.map((cell, i) => (
							<th key={i}>{cell}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{body.map((row, r) => (
						<tr key={r}>
							{row.map((cell, c) => (
								<td key={c}>{cell}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Glyph({ file }: { file: VaultFile }) {
	const KindIcon = kindIcon(fileKind(file.mime, file.name));
	return (
		<span className="viewer-glyph">
			<KindIcon />
		</span>
	);
}

function Unsupported({ file, reason }: { file: VaultFile; reason?: string }) {
	return (
		<div className="viewer-fallback">
			<Glyph file={file} />
			<strong>{file.name}</strong>
			<p className="muted">{reason ?? 'No preview available for this file type.'}</p>
			<a className="btn primary" href={fileContentUrl(file.id, true)}>
				<IconDownload /> Download
			</a>
		</div>
	);
}
