import { useState } from 'react';
import { useVault } from '../VaultProvider';
import { extractOutline } from '../markdown';
import { CodeEditor } from './CodeEditor';
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
		uploadFiles,
		libraryOpen,
	} = useVault();
	const [dragging, setDragging] = useState(false);

	if (libraryOpen) return null;
	if (!activeNote) {
		return (
			<section className="empty-main">
				<p>Select a note or create one to begin.</p>
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
					void uploadFiles(e.dataTransfer.files, activeNote.id);
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
