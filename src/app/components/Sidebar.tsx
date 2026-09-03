import { useMemo, useState } from 'react';
import { useVault } from '../VaultProvider';
import type { Folder, NoteMeta } from '../types';
import { dialog } from './Dialog';
import {
	IconFolder,
	IconNote,
	IconPencil,
	IconPlus,
	IconSearch,
	IconTrash,
	IconUnfile,
	IconUpload,
} from './Icons';

export function Sidebar() {
	const {
		folders,
		notes,
		query,
		searchHits,
		selectedNoteId,
		selectNote,
		setQuery,
		createNote,
		createFolder,
		deleteNote,
		deleteFolder,
		renameFolder,
		renameNote,
		moveNote,
		uploadFiles,
		sidebarOpen,
		appMode,
		setAppMode,
		driveFolderId,
		setDriveFolderId,
	} = useVault();
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const visibleNotes = useMemo(() => {
		if (!searchHits) return notes;
		return notes.filter((n) => searchHits.has(n.id));
	}, [notes, searchHits]);

	if (!sidebarOpen) return null;

	const roots = folders.filter((f) => !f.parent_id);
	const unfiled = visibleNotes.filter((n) => !n.folder_id);

	return (
		<aside className="sidebar">
			<div className="mode-switch">
				<button
					type="button"
					className={appMode === 'notes' ? 'active' : ''}
					onClick={() => setAppMode('notes')}
				>
					Notes
				</button>
				<button
					type="button"
					className={appMode === 'drive' ? 'active' : ''}
					onClick={() => setAppMode('drive')}
				>
					Drive
				</button>
			</div>
			<div className="sidebar-search">
				<IconSearch />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={appMode === 'drive' ? 'Search vault' : 'Search notes'}
					aria-label="Search"
				/>
			</div>
			<div className="sidebar-actions">
				{appMode === 'notes' ? (
					<button type="button" onClick={() => void createNote(null)}>
						<IconPlus /> Note
					</button>
				) : (
					<button type="button" onClick={() => setDriveFolderId(null)}>
						My Drive
					</button>
				)}
				<button type="button" onClick={() => void createFolder(appMode === 'drive' ? driveFolderId : null)}>
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
								void uploadFiles(e.target.files, {
									folderId: appMode === 'drive' ? driveFolderId : undefined,
									noteId: appMode === 'drive' ? null : undefined,
								});
							}
							e.target.value = '';
						}}
					/>
				</label>
			</div>
			<nav className="tree" aria-label="Vault">
				{roots.map((folder) => (
					<FolderNode
						key={folder.id}
						folder={folder}
						folders={folders}
						notes={appMode === 'notes' ? visibleNotes : []}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
						selectedNoteId={selectedNoteId}
						selectNote={selectNote}
						createNote={createNote}
						createFolder={createFolder}
						deleteFolder={deleteFolder}
						renameFolder={renameFolder}
						deleteNote={deleteNote}
						renameNote={renameNote}
						moveNote={moveNote}
						driveFolderId={driveFolderId}
						onOpenFolder={appMode === 'drive' ? setDriveFolderId : undefined}
					/>
				))}
				{appMode === 'notes' && unfiled.length > 0 && (
					<div className="tree-section">
						<div className="tree-label">Unfiled</div>
						{unfiled.map((note) => (
							<NoteRow
								key={note.id}
								note={note}
								selected={note.id === selectedNoteId}
								onSelect={() => void selectNote(note.id)}
								onDelete={() => void deleteNote(note.id)}
								onRename={(title) => void renameNote(note.id, title)}
							/>
						))}
					</div>
				)}
			</nav>
		</aside>
	);
}

function FolderNode({
	folder,
	folders,
	notes,
	collapsed,
	setCollapsed,
	selectedNoteId,
	selectNote,
	createNote,
	createFolder,
	deleteFolder,
	renameFolder,
	deleteNote,
	renameNote,
	moveNote,
	driveFolderId,
	onOpenFolder,
}: {
	folder: Folder;
	folders: Folder[];
	notes: NoteMeta[];
	collapsed: Record<string, boolean>;
	setCollapsed: (value: Record<string, boolean>) => void;
	selectedNoteId: string | null;
	selectNote: (id: string) => void;
	createNote: (folderId?: string | null) => Promise<void>;
	createFolder: (parentId?: string | null) => Promise<void>;
	deleteFolder: (id: string) => Promise<void>;
	renameFolder: (id: string, name: string) => Promise<void>;
	deleteNote: (id: string) => Promise<void>;
	renameNote: (id: string, title: string) => Promise<void>;
	moveNote: (id: string, folderId: string | null) => Promise<void>;
	driveFolderId?: string | null;
	onOpenFolder?: (id: string | null) => void;
}) {
	const isCollapsed = collapsed[folder.id] ?? false;
	const childFolders = folders.filter((f) => f.parent_id === folder.id);
	const childNotes = notes.filter((n) => n.folder_id === folder.id);

	return (
		<div className="tree-folder">
			<div className={`tree-row folder-row ${driveFolderId === folder.id ? 'selected' : ''}`}>
				<button
					type="button"
					className="tree-main"
					onClick={() => {
						if (onOpenFolder) {
							onOpenFolder(folder.id);
							setCollapsed({ ...collapsed, [folder.id]: false });
						} else setCollapsed({ ...collapsed, [folder.id]: !isCollapsed });
					}}
				>
					<span className={`chevron ${isCollapsed ? '' : 'open'}`}>▸</span>
					<IconFolder />
					<span className="tree-name">{folder.name}</span>
				</button>
				<button
					type="button"
					className="icon-btn"
					title="New note in folder"
					onClick={() => void createNote(folder.id)}
				>
					<IconPlus />
				</button>
				<button
					type="button"
					className="icon-btn"
					title="New subfolder"
					onClick={() => void createFolder(folder.id)}
				>
					<IconFolder />
				</button>
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
							message: 'Notes inside will be unfiled, not deleted.',
							confirmLabel: 'Delete folder',
							danger: true,
						});
						if (ok) void deleteFolder(folder.id);
					}}
				>
					<IconTrash />
				</button>
			</div>
			{!isCollapsed && (
				<div className="tree-children">
					{childFolders.map((child) => (
						<FolderNode
							key={child.id}
							folder={child}
							folders={folders}
							notes={notes}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							selectedNoteId={selectedNoteId}
							selectNote={selectNote}
							createNote={createNote}
							createFolder={createFolder}
							deleteFolder={deleteFolder}
							renameFolder={renameFolder}
							deleteNote={deleteNote}
							renameNote={renameNote}
							moveNote={moveNote}
							driveFolderId={driveFolderId}
							onOpenFolder={onOpenFolder}
						/>
					))}
					{childNotes.map((note) => (
						<NoteRow
							key={note.id}
							note={note}
							selected={note.id === selectedNoteId}
							onSelect={() => void selectNote(note.id)}
							onDelete={() => void deleteNote(note.id)}
							onRename={(title) => void renameNote(note.id, title)}
							onUnfile={() => void moveNote(note.id, null)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function NoteRow({
	note,
	selected,
	onSelect,
	onDelete,
	onRename,
	onUnfile,
}: {
	note: NoteMeta;
	selected: boolean;
	onSelect: () => void;
	onDelete: () => void;
	onRename: (title: string) => void;
	onUnfile?: () => void;
}) {
	return (
		<div className={`tree-row note-row ${selected ? 'selected' : ''}`}>
			<button type="button" className="tree-main" onClick={onSelect}>
				<IconNote />
				<span className="tree-name">{note.title}</span>
			</button>
			<button
				type="button"
				className="icon-btn"
				title="Rename"
				onClick={async () => {
					const title = await dialog.prompt('Rename note', note.title);
					if (title) onRename(title);
				}}
			>
				<IconPencil />
			</button>
			{onUnfile && (
				<button type="button" className="icon-btn" title="Move out of folder" onClick={onUnfile}>
					<IconUnfile />
				</button>
			)}
			<button
				type="button"
				className="icon-btn danger"
				title="Delete note"
				onClick={async () => {
					const ok = await dialog.confirm(`Delete “${note.title}”?`, {
						message: 'This cannot be undone.',
						confirmLabel: 'Delete note',
						danger: true,
					});
					if (ok) onDelete();
				}}
			>
				<IconTrash />
			</button>
		</div>
	);
}
