import { useEffect, useState } from 'react';
import { fileContentUrl } from '../api';
import { useVault } from '../VaultProvider';
import { extOf, fileKind, folderPath, formatBytes, formatDate } from '../format';
import { extractOutline } from '../markdown';
import { dialog } from './Dialog';
import {
	IconClose,
	IconDownload,
	IconExpand,
	IconFolder,
	IconPencil,
	IconTrash,
	kindIcon,
} from './Icons';
import type { VaultFile } from '../types';

export function RightPane() {
	const {
		activeNote,
		files,
		folders,
		selectedFileId,
		selectFile,
		deleteFile,
		renameFile,
		moveFile,
		openPreview,
		appMode,
		rightOpen,
	} = useVault();

	if (!rightOpen) return null;

	const outline = activeNote ? extractOutline(activeNote.body) : [];
	const attached = files.filter((f) => activeNote && f.note_id === activeNote.id);
	const selected = files.find((f) => f.id === selectedFileId) ?? null;

	return (
		<aside className="right-pane">
			{selected && (
				<div className="details">
					<div className="details-head">
						<span className="details-name" title={selected.name}>
							{selected.name}
						</span>
						<button
							type="button"
							className="icon-btn"
							title="Close details"
							onClick={() => selectFile(null)}
						>
							<IconClose />
						</button>
					</div>

					<button
						type="button"
						className="details-preview"
						title="Open preview"
						onClick={() => openPreview(selected.id)}
					>
						<Thumb file={selected} />
						<span className="details-open">
							<IconExpand /> Open
						</span>
					</button>

					<dl className="details-list">
						<dt>Type</dt>
						<dd>{describeType(selected)}</dd>
						<dt>Size</dt>
						<dd>{formatBytes(selected.size)}</dd>
						<dt>Location</dt>
						<dd>
							<span className="details-loc">
								<IconFolder /> {folderPath(folders, selected.folder_id)}
							</span>
						</dd>
						<dt>Modified</dt>
						<dd>{formatDate(selected.updated_at || selected.created_at)}</dd>
						<dt>Created</dt>
						<dd>{formatDate(selected.created_at)}</dd>
					</dl>

					<div className="details-actions">
						<a className="chip" href={fileContentUrl(selected.id, true)}>
							<IconDownload /> Download
						</a>
						<button
							type="button"
							className="chip"
							onClick={async () => {
								const name = await dialog.prompt('Rename file', selected.name);
								if (name) void renameFile(selected.id, name);
							}}
						>
							<IconPencil /> Rename
						</button>
						<button
							type="button"
							className="chip"
							onClick={async () => {
								const picked = await dialog.choose(
									'Move to folder',
									[
										{ label: 'My Drive', value: null },
										...folders.map((folder) => ({
											label: folder.name,
											value: folder.id,
											hint: folderPath(folders, folder.id),
										})),
									],
									{ message: `Choose a destination for “${selected.name}”.` },
								);
								if (picked !== undefined) void moveFile(selected.id, picked);
							}}
						>
							<IconFolder /> Move
						</button>
						<button
							type="button"
							className="chip danger"
							onClick={async () => {
								const ok = await dialog.confirm(`Delete “${selected.name}”?`, {
									message: 'The file will be removed from storage permanently.',
									confirmLabel: 'Delete file',
									danger: true,
								});
								if (ok) void deleteFile(selected.id);
							}}
						>
							<IconTrash /> Delete
						</button>
					</div>
				</div>
			)}
			{appMode !== 'drive' && (
				<>
					<section>
						<h3>Outline</h3>
						{outline.length === 0 && <p className="muted">Headings will appear here.</p>}
						<ul className="outline">
							{outline.map((item) => (
								<li
									key={`${item.id}-${item.level}`}
									className={`outline-l${item.level}`}
									style={{ paddingLeft: (item.level - 1) * 12 }}
								>
									<a href={`#${item.id}`}>{item.text}</a>
								</li>
							))}
						</ul>
					</section>
					<section>
						<h3>Attachments</h3>
						{attached.length === 0 && <p className="muted">Drop files onto the editor.</p>}
						<ul className="file-list">
							{attached.map((file) => {
								const KindIcon = kindIcon(fileKind(file.mime, file.name));
								return (
									<li key={file.id}>
										<button
											type="button"
											className="file-item"
											onClick={() => selectFile(file.id)}
											onDoubleClick={() => openPreview(file.id)}
										>
											<KindIcon />
											<span>{file.name}</span>
										</button>
										<button
											type="button"
											className="icon-btn danger"
											title="Delete file"
											onClick={async () => {
												const ok = await dialog.confirm(`Delete “${file.name}”?`, {
													message: 'The file will be removed from storage permanently.',
													confirmLabel: 'Delete file',
													danger: true,
												});
												if (ok) void deleteFile(file.id);
											}}
										>
											<IconTrash />
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				</>
			)}
		</aside>
	);
}

function describeType(file: VaultFile): string {
	const kind = fileKind(file.mime, file.name);
	const label = kind === 'other' ? extOf(file.name).toUpperCase() : kind;
	return `${label.charAt(0).toUpperCase()}${label.slice(1)}${file.mime ? ` · ${file.mime}` : ''}`;
}

/**
 * Still image only. Video and audio stay unplayed here so opening the details
 * panel never streams bytes; playback belongs to the double-click viewer.
 */
function Thumb({ file }: { file: VaultFile }) {
	const kind = fileKind(file.mime, file.name);
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [file.id]);
	const KindIcon = kindIcon(kind);

	if (kind === 'image' && !failed) {
		return (
			<img
				className="details-thumb"
				src={fileContentUrl(file.id)}
				alt=""
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<span className="details-glyph">
			<KindIcon />
			<em>{extOf(file.name)}</em>
		</span>
	);
}
