import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '../markdown';
import type { NoteMeta, VaultFile } from '../types';

export function MarkdownPreview({
	body,
	notes,
	files,
	onOpenNote,
}: {
	body: string;
	notes: NoteMeta[];
	files: VaultFile[];
	onOpenNote: (id: string) => void;
}) {
	const [html, setHtml] = useState('');
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cancelled = false;
		void renderMarkdown(body, notes, files).then((out) => {
			if (!cancelled) setHtml(out);
		});
		return () => {
			cancelled = true;
		};
	}, [body, files, notes]);

	return (
		<div
			ref={ref}
			className="preview"
			onClick={(event) => {
				const target = event.target as HTMLElement;
				const link = target.closest('a.wiki-link') as HTMLAnchorElement | null;
				if (!link) return;
				event.preventDefault();
				const id = link.hash.replace('#note:', '');
				if (id) onOpenNote(id);
			}}
		>
			<article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	);
}
