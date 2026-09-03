import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, highlightActiveLine, keymap, lineNumbers, placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'react';
import type { Theme } from '../types';

const lightHighlight = HighlightStyle.define([
	{ tag: tags.heading, fontWeight: '600', color: '#1c1917' },
	{ tag: tags.emphasis, fontStyle: 'italic' },
	{ tag: tags.strong, fontWeight: '700' },
	{ tag: tags.link, color: '#2563eb' },
	{ tag: tags.meta, color: '#78716c' },
	{ tag: tags.keyword, color: '#7c3aed' },
	{ tag: tags.monospace, color: '#0f766e' },
]);

const lightTheme = EditorView.theme(
	{
		'&': {
			backgroundColor: 'transparent',
			color: '#1c1917',
			height: '100%',
			fontSize: '14.5px',
		},
		'.cm-content': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', caretColor: '#1c1917' },
		'.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#a8a29e' },
		'.cm-activeLine': { backgroundColor: 'rgba(0,0,0,0.04)' },
		'.cm-scroller': { overflow: 'auto' },
	},
	{ dark: false },
);

const darkTheme = EditorView.theme({
	'&': { height: '100%', fontSize: '14.5px', backgroundColor: 'transparent' },
	'.cm-content': { fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
	'.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
	'.cm-scroller': { overflow: 'auto' },
});

export function CodeEditor({
	value,
	onChange,
	theme,
}: {
	value: string;
	onChange: (value: string) => void;
	theme: Theme;
}) {
	const parentRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	useEffect(() => {
		if (!parentRef.current) return;
		const extensions = [
			history(),
			lineNumbers(),
			highlightActiveLine(),
			markdown(),
			keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
			placeholder('Start writing…'),
			EditorView.lineWrapping,
			EditorView.updateListener.of((update) => {
				if (update.docChanged) onChangeRef.current(update.state.doc.toString());
			}),
			theme === 'dark' ? oneDark : [lightTheme, syntaxHighlighting(lightHighlight)],
			theme === 'dark' ? darkTheme : [],
		];
		const view = new EditorView({
			parent: parentRef.current,
			state: EditorState.create({ doc: value, extensions }),
		});
		viewRef.current = view;
		return () => {
			view.destroy();
			viewRef.current = null;
		};
		// Recreate only when theme changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [theme]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		if (view.state.doc.toString() === value) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
		});
	}, [value]);

	return <div className="cm-host" ref={parentRef} />;
}
