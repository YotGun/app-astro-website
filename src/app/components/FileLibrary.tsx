import { fileContentUrl } from '../api';
import { useVault } from '../VaultProvider';
import type { LibraryFilter, VaultFile } from '../types';
import { useMemo, useState } from 'react';
import { IconTrash } from './Icons';
import { Media } from './RightPane';

function kindOf(file: VaultFile): LibraryFilter {
	if (file.mime.startsWith('video/')) return 'video';
	if (file.mime.startsWith('image/')) return 'image';
	if (file.mime === 'application/pdf') return 'pdf';
	return 'other';
}

export function FileLibrary() {
	const { files, libraryOpen, selectFile, selectedFileId, deleteFile, notes } = useVault();
	const [filter, setFilter] = useState<LibraryFilter>('all');

	const visible = useMemo(
		() => files.filter((f) => (filter === 'all' ? true : kindOf(f) === filter)),
		[files, filter],
	);
	const selected = files.find((f) => f.id === selectedFileId);

	if (!libraryOpen) return null;

	return (
		<section className="library">
			<div className="library-toolbar">
				{(['all', 'video', 'image', 'pdf', 'other'] as const).map((key) => (
					<button
						key={key}
						type="button"
						className={filter === key ? 'active' : ''}
						onClick={() => setFilter(key)}
					>
						{key}
					</button>
				))}
			</div>
			<div className="library-grid">
				{visible.map((file) => {
					const note = notes.find((n) => n.id === file.note_id);
					return (
						<article
							key={file.id}
							className={`library-card ${selectedFileId === file.id ? 'selected' : ''}`}
						>
							<button type="button" className="thumb" onClick={() => selectFile(file.id)}>
								{file.mime.startsWith('image/') ? (
									<img src={fileContentUrl(file.id)} alt="" />
								) : file.mime.startsWith('video/') ? (
									<video src={fileContentUrl(file.id)} muted preload="metadata" />
								) : (
									<span>{file.name.split('.').pop()}</span>
								)}
							</button>
							<div className="library-meta">
								<strong>{file.name}</strong>
								<small>{note ? note.title : 'Unattached'}</small>
							</div>
							<button
								type="button"
								className="icon-btn danger"
								onClick={() => {
									if (window.confirm(`Delete ${file.name}?`)) void deleteFile(file.id);
								}}
							>
								<IconTrash />
							</button>
						</article>
					);
				})}
				{visible.length === 0 && <p className="muted">No files in this filter.</p>}
			</div>
			{selected && (
				<div className="library-player">
					<Media file={selected} />
				</div>
			)}
		</section>
	);
}
