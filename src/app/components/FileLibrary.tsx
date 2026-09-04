import { useEffect, useMemo, useState } from 'react';
import { fileContentUrl } from '../api';
import { extOf, fileKind, formatBytes, formatDate } from '../format';
import { useVault } from '../VaultProvider';
import type { Folder, LibraryFilter, VaultFile } from '../types';
import { dialog } from './Dialog';
import {
	IconDownload,
	IconFolder,
	IconGrid,
	IconList,
	IconNote,
	IconPencil,
	IconPlus,
	IconTrash,
	IconUpload,
	kindIcon,
} from './Icons';

const FILTERS: Array<[LibraryFilter, string]> = [
	['all', 'All'],
	['image', 'Images'],
	['video', 'Video'],
	['audio', 'Audio'],
	['pdf', 'PDF'],
	['other', 'Other'],
];

export function FileLibrary() {
	const {
		appMode,
		folders,
		notes,
		files,
		driveFolderId,
		setDriveFolderId,
		driveLayout,
		setDriveLayout,
		selectedFileId,
		selectFile,
		selectNote,
		openPreview,
		rightOpen,
		uploadFiles,
		createFolder,
		renameFolder,
		deleteFolder,
		deleteFile,
		setAppMode,
	} = useVault();
	const [filter, setFilter] = useState<LibraryFilter>('all');
	const [query, setQuery] = useState('');
	const [dragging, setDragging] = useState(false);
	const [sort, setSort] = useState<'name' | 'date' | 'size'>('name');

	useEffect(() => {
		if (appMode !== 'drive') return;
		const onPaste = (event: ClipboardEvent) => {
			const items = [...(event.clipboardData?.files ?? [])];
			if (!items.length) return;
			event.preventDefault();
			const stamped = items.map((file, i) => {
				if (file.name && file.name !== 'image.png' && file.name !== 'blob') return file;
				const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
				return new File(
					[file],
					`Paste ${new Date().toISOString().slice(0, 19).replace('T', ' ')}${items.length > 1 ? ` ${i + 1}` : ''}.${ext}`,
					{ type: file.type },
				);
			});
			void uploadFiles(stamped, { folderId: driveFolderId, noteId: null });
		};
		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	}, [appMode, driveFolderId, uploadFiles]);

	const crumbs = useMemo(() => {
		const trail: Folder[] = [];
		let cursor = driveFolderId;
		const seen = new Set<string>();
		while (cursor && !seen.has(cursor)) {
			seen.add(cursor);
			const folder = folders.find((f) => f.id === cursor);
			if (!folder) break;
			trail.unshift(folder);
			cursor = folder.parent_id;
		}
		return trail;
	}, [driveFolderId, folders]);

	const childFolders = useMemo(() => {
		const q = query.trim().toLowerCase();
		return folders
			.filter((f) => f.parent_id === driveFolderId)
			.filter((f) => !q || f.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [driveFolderId, folders, query]);

	const childNotes = useMemo(() => {
		const q = query.trim().toLowerCase();
		return notes
			.filter((n) => n.folder_id === driveFolderId)
			.filter((n) => !q || n.title.toLowerCase().includes(q))
			.sort((a, b) => a.title.localeCompare(b.title));
	}, [driveFolderId, notes, query]);

	const childFiles = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = files.filter((f) => f.folder_id === driveFolderId);
		const filtered = list.filter((f) => {
			if (q && !f.name.toLowerCase().includes(q)) return false;
			if (filter === 'all') return true;
			return fileKind(f.mime, f.name) === filter;
		});
		filtered.sort((a, b) => {
			if (sort === 'size') return b.size - a.size;
			if (sort === 'date') return (b.updated_at || b.created_at) - (a.updated_at || a.created_at);
			return a.name.localeCompare(b.name);
		});
		return filtered;
	}, [driveFolderId, files, filter, query, sort]);

	if (appMode !== 'drive') return null;

	const visibleNotes = filter === 'all' ? childNotes.length : 0;
	const itemCount = childFolders.length + childFiles.length + visibleNotes;

	// With the details pane off-screen there is nowhere for a selection to show,
	// so a single click has to open the viewer instead.
	const chooseFile = (id: string) => {
		selectFile(id);
		if (!rightOpen || window.matchMedia('(max-width: 900px)').matches) openPreview(id);
	};

	return (
		<section
			className={`drive ${dragging ? 'dropping' : ''}`}
			onMouseDown={(e) => {
				// Clicking the empty canvas deselects, the way Drive does.
				const target = e.target as HTMLElement;
				if (target.closest('.library-card, .drive-table, .drive-toolbar, .drive-filters')) return;
				selectFile(null);
			}}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				if (e.dataTransfer.files.length) {
					void uploadFiles(e.dataTransfer.files, { folderId: driveFolderId, noteId: null });
				}
			}}
		>
			{dragging && <div className="drop-hint">Drop anything here — images, PDFs, zips, lectures…</div>}
			<div className="drive-toolbar">
				<nav className="crumbs" aria-label="Folder path">
					<button type="button" onClick={() => setDriveFolderId(null)}>
						My Drive
					</button>
					{crumbs.map((folder) => (
						<span key={folder.id}>
							<span className="crumb-sep">/</span>
							<button type="button" onClick={() => setDriveFolderId(folder.id)}>
								{folder.name}
							</button>
						</span>
					))}
				</nav>
				<div className="drive-actions">
					<input
						className="drive-search"
						value={query}
						placeholder="Filter this folder"
						onChange={(e) => setQuery(e.target.value)}
					/>
					<button type="button" className="chip" onClick={() => void createFolder(driveFolderId)}>
						<IconPlus /> Folder
					</button>
					<label className="upload-btn">
						<IconUpload />
						Upload
						<input
							type="file"
							multiple
							hidden
							onChange={(e) => {
								if (e.target.files?.length) {
									void uploadFiles(e.target.files, { folderId: driveFolderId, noteId: null });
								}
								e.target.value = '';
							}}
						/>
					</label>
					<div className="seg seg-icon">
						<button
							type="button"
							title="Grid view"
							aria-label="Grid view"
							className={driveLayout === 'grid' ? 'active' : ''}
							onClick={() => setDriveLayout('grid')}
						>
							<IconGrid />
						</button>
						<button
							type="button"
							title="List view"
							aria-label="List view"
							className={driveLayout === 'list' ? 'active' : ''}
							onClick={() => setDriveLayout('list')}
						>
							<IconList />
						</button>
					</div>
				</div>
			</div>
			<div className="drive-filters">
				{FILTERS.map(([key, label]) => (
					<button
						key={key}
						type="button"
						className={filter === key ? 'active' : ''}
						onClick={() => setFilter(key)}
					>
						{label}
					</button>
				))}
				<span className="drive-count">
					{itemCount} {itemCount === 1 ? 'item' : 'items'}
				</span>
				<label className="sort-label">
					Sort
					<select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
						<option value="name">Name</option>
						<option value="date">Modified</option>
						<option value="size">Size</option>
					</select>
				</label>
			</div>
			{driveLayout === 'grid' ? (
				<div className="library-grid">
					{childFolders.map((folder) => (
						<button
							key={folder.id}
							type="button"
							className="library-card folder-card"
							onDoubleClick={() => setDriveFolderId(folder.id)}
							onClick={() => setDriveFolderId(folder.id)}
						>
							<div className="thumb folder-thumb">
								<IconFolder />
							</div>
							<div className="library-meta">
								<strong>{folder.name}</strong>
								<small>Folder</small>
							</div>
						</button>
					))}
					{filter === 'all' &&
						childNotes.map((note) => (
							<article key={note.id} className="library-card">
								<button
									type="button"
									className="thumb note-thumb"
									onClick={() => {
										setAppMode('notes');
										void selectNote(note.id);
									}}
								>
									<IconNote />
								</button>
								<div className="library-meta">
									<strong>{note.title}</strong>
									<small>Note</small>
								</div>
							</article>
						))}
					{childFiles.map((file) => (
						<FileCard
							key={file.id}
							file={file}
							selected={file.id === selectedFileId}
							onSelect={() => chooseFile(file.id)}
							onOpen={() => openPreview(file.id)}
							onDelete={async () => {
								const ok = await dialog.confirm(`Delete “${file.name}”?`, {
									message: 'The file will be removed from storage permanently.',
									confirmLabel: 'Delete file',
									danger: true,
								});
								if (ok) void deleteFile(file.id);
							}}
						/>
					))}
				</div>
			) : (
				<table className="drive-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Size</th>
							<th>Modified</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{childFolders.map((folder) => (
							<tr key={folder.id} className="folder-row-drive">
								<td>
									<button type="button" className="name-btn" onClick={() => setDriveFolderId(folder.id)}>
										<IconFolder /> {folder.name}
									</button>
								</td>
								<td>Folder</td>
								<td>—</td>
								<td>{formatDate(folder.updated_at)}</td>
								<td className="row-actions">
									<button
										type="button"
										className="icon-btn"
										title="Rename folder"
										onClick={async () => {
											const name = await dialog.prompt('Rename folder', folder.name);
											if (name) void renameFolder(folder.id, name);
										}}
									>
										<IconPencil />
									</button>
									<button
										type="button"
										className="icon-btn danger"
										title="Delete folder"
										onClick={async () => {
											const ok = await dialog.confirm(`Delete “${folder.name}”?`, {
												message: 'Items inside will move back to My Drive.',
												confirmLabel: 'Delete folder',
												danger: true,
											});
											if (ok) void deleteFolder(folder.id);
										}}
									>
										<IconTrash />
									</button>
								</td>
							</tr>
						))}
						{filter === 'all' &&
							childNotes.map((note) => (
								<tr key={note.id}>
									<td>
										<button
											type="button"
											className="name-btn"
											onClick={() => {
												setAppMode('notes');
												void selectNote(note.id);
											}}
										>
											<IconNote /> {note.title}
										</button>
									</td>
									<td>Note</td>
									<td>—</td>
									<td>{formatDate(note.updated_at)}</td>
									<td className="row-actions" />
								</tr>
							))}
						{childFiles.map((file) => {
							const KindIcon = kindIcon(fileKind(file.mime, file.name));
							return (
								<tr
									key={file.id}
									className={selectedFileId === file.id ? 'selected' : ''}
									onDoubleClick={() => openPreview(file.id)}
								>
									<td>
										<button
											type="button"
											className="name-btn"
											title="Double-click to open"
											onClick={() => chooseFile(file.id)}
										>
											<KindIcon /> {file.name}
										</button>
									</td>
									<td>
										<span className="ext-tag">{extOf(file.name)}</span>
									</td>
									<td>{formatBytes(file.size)}</td>
									<td>{formatDate(file.updated_at || file.created_at)}</td>
									<td className="row-actions">
										<a
											className="icon-btn"
											href={fileContentUrl(file.id, true)}
											title={`Download ${file.name}`}
										>
											<IconDownload />
										</a>
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
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
			{itemCount === 0 && (
				<div className="empty-state empty-drive">
					<span className="empty-glyph">
						<IconUpload />
					</span>
					<strong>{query || filter !== 'all' ? 'Nothing matches' : 'This folder is empty'}</strong>
					<p className="muted">
						{query || filter !== 'all'
							? 'Try a different filter or clear the search.'
							: 'Drag files anywhere on this page, or paste a screenshot to back it up.'}
					</p>
				</div>
			)}
		</section>
	);
}

function FileCard({
	file,
	selected,
	onSelect,
	onOpen,
	onDelete,
}: {
	file: VaultFile;
	selected: boolean;
	onSelect: () => void;
	onOpen: () => void;
	onDelete: () => void;
}) {
	const kind = fileKind(file.mime, file.name);
	const KindIcon = kindIcon(kind);
	const [previewFailed, setPreviewFailed] = useState(false);
	const showPreview = !previewFailed && (kind === 'image' || kind === 'video');
	return (
		<article
			className={`library-card ${selected ? 'selected' : ''}`}
			onDoubleClick={onOpen}
			title="Double-click to open"
		>
			<button type="button" className="thumb" onClick={onSelect}>
				{showPreview && kind === 'image' ? (
					<img
						src={fileContentUrl(file.id)}
						alt=""
						loading="lazy"
						onError={() => setPreviewFailed(true)}
					/>
				) : showPreview ? (
					<video
						src={fileContentUrl(file.id)}
						muted
						preload="metadata"
						onError={() => setPreviewFailed(true)}
					/>
				) : (
					<span className="thumb-glyph">
						<KindIcon />
						<em>{extOf(file.name)}</em>
					</span>
				)}
			</button>
			<div className="library-meta">
				<strong title={file.name}>{file.name}</strong>
				<small>
					{formatBytes(file.size)} · {kind === 'other' ? extOf(file.name).toUpperCase() : kind}
				</small>
			</div>
			<div className="card-actions">
				<a
					className="icon-btn"
					href={fileContentUrl(file.id, true)}
					title={`Download ${file.name}`}
					onClick={(event) => event.stopPropagation()}
				>
					<IconDownload />
				</a>
				<button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
					<IconTrash />
				</button>
			</div>
		</article>
	);
}
