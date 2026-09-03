import { fileContentUrl } from '../api';
import { useVault } from '../VaultProvider';
import { extractOutline } from '../markdown';
import { IconClose, IconFile, IconTrash } from './Icons';

export function RightPane() {
	const {
		activeNote,
		files,
		selectedFileId,
		selectFile,
		deleteFile,
		rightOpen,
		libraryOpen,
	} = useVault();

	if (!rightOpen) return null;

	const outline = activeNote ? extractOutline(activeNote.body) : [];
	const attached = files.filter((f) => activeNote && f.note_id === activeNote.id);
	const selected = files.find((f) => f.id === selectedFileId) ?? null;

	return (
		<aside className="right-pane">
			{selected && (
				<div className="viewer">
					<div className="viewer-head">
						<span>{selected.name}</span>
						<button type="button" className="icon-btn" onClick={() => selectFile(null)}>
							<IconClose />
						</button>
					</div>
					<Media file={selected} />
				</div>
			)}
			{!libraryOpen && (
				<>
					<section>
						<h3>Outline</h3>
						{outline.length === 0 && <p className="muted">Headings will appear here.</p>}
						<ul className="outline">
							{outline.map((item) => (
								<li key={`${item.id}-${item.level}`} style={{ paddingLeft: (item.level - 1) * 12 }}>
									<a href={`#${item.id}`}>{item.text}</a>
								</li>
							))}
						</ul>
					</section>
					<section>
						<h3>Attachments</h3>
						{attached.length === 0 && <p className="muted">Drop files onto the editor.</p>}
						<ul className="file-list">
							{attached.map((file) => (
								<li key={file.id}>
									<button type="button" className="file-item" onClick={() => selectFile(file.id)}>
										<IconFile />
										<span>{file.name}</span>
									</button>
									<button
										type="button"
										className="icon-btn danger"
										onClick={() => {
											if (window.confirm(`Delete ${file.name}?`)) void deleteFile(file.id);
										}}
									>
										<IconTrash />
									</button>
								</li>
							))}
						</ul>
					</section>
				</>
			)}
		</aside>
	);
}

export function Media({ file }: { file: { id: string; name: string; mime: string } }) {
	const src = fileContentUrl(file.id);
	if (file.mime.startsWith('video/')) {
		return <video className="media" controls preload="metadata" src={src} />;
	}
	if (file.mime.startsWith('audio/')) {
		return <audio className="media" controls src={src} />;
	}
	if (file.mime.startsWith('image/')) {
		return <img className="media" src={src} alt={file.name} />;
	}
	if (file.mime === 'application/pdf') {
		return <iframe className="media pdf-frame" title={file.name} src={src} />;
	}
	return (
		<a className="download" href={src} target="_blank" rel="noreferrer">
			Open {file.name}
		</a>
	);
}
