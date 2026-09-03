import { useState } from 'react';
import { useVault } from '../VaultProvider';
import { extractOutline } from '../markdown';
import { CodeEditor } from './CodeEditor';
import { IconNote, IconPlus } from './Icons';
import { MarkdownPreview } from './MarkdownPreview';

export function EditorPane() {
	const {
		activeNote,
		notes,
		files,
		viewMode,
		theme,
		updateBody,
		selectNote,
		createNote,
		uploadFiles,
		libraryOpen,
	} = useVault();
	const [dragging, setDragging] = useState(false);

	if (libraryOpen) return null;
	if (!activeNote) {
		return (
			<section className="empty-main">
				<div className="empty-state">
					<span className="empty-glyph">
						<IconNote />
					</span>
					<strong>Nothing open</strong>
					<p className="muted">
						Pick a note from the sidebar, or press <kbd>⌘K</kbd> to jump anywhere.
					</p>
					<button type="button" className="btn btn-primary" onClick={() => void createNote(null)}>
						<IconPlus /> New note
					</button>
				</div>
			</section>
		);
	}

	const showEditor = viewMode === 'edit' || viewMode === 'split';
	const showPreview = viewMode === 'preview' || viewMode === 'split';

	return (
		<section
			className={`editor-pane view-${viewMode} ${dragging ? 'dropping' : ''}`}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				if (e.dataTransfer.files.length) {
					void uploadFiles(e.dataTransfer.files, { noteId: activeNote.id });
				}
			}}
		>
			{dragging && <div className="drop-hint">Drop files onto this note</div>}
			{showEditor && (
				<CodeEditor key={activeNote.id} value={activeNote.body} onChange={updateBody} theme={theme} />
			)}
			{showPreview && (
				<MarkdownPreview
					body={activeNote.body}
					notes={notes}
					files={files}
					onOpenNote={(id) => void selectNote(id)}
				/>
			)}
		</section>
	);
}

export function useActiveOutline() {
	const { activeNote } = useVault();
	return activeNote ? extractOutline(activeNote.body) : [];
}
