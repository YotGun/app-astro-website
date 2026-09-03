import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { api, uploadBytes } from './api';
import { cacheList, cacheNoteBody, db } from './db';
import { deriveTitle, parseFrontmatter } from './markdown';
import type { Folder, Note, NoteMeta, Theme, VaultFile, ViewMode } from './types';

type VaultContextValue = {
	folders: Folder[];
	notes: NoteMeta[];
	files: VaultFile[];
	selectedNoteId: string | null;
	selectedFileId: string | null;
	activeNote: Note | null;
	viewMode: ViewMode;
	theme: Theme;
	sidebarOpen: boolean;
	rightOpen: boolean;
	libraryOpen: boolean;
	paletteOpen: boolean;
	query: string;
	searchHits: Set<string> | null;
	saving: boolean;
	status: string;
	error: string | null;
	selectNote: (id: string | null) => void;
	selectFile: (id: string | null) => void;
	setViewMode: (mode: ViewMode) => void;
	cycleViewMode: () => void;
	toggleTheme: () => void;
	setSidebarOpen: (open: boolean) => void;
	setRightOpen: (open: boolean) => void;
	setLibraryOpen: (open: boolean) => void;
	setPaletteOpen: (open: boolean) => void;
	setQuery: (q: string) => void;
	updateBody: (body: string) => void;
	flushSave: (id?: string) => Promise<void>;
	createNote: (folderId?: string | null) => Promise<void>;
	deleteNote: (id: string) => Promise<void>;
	renameNote: (id: string, title: string) => Promise<void>;
	moveNote: (id: string, folderId: string | null) => Promise<void>;
	createFolder: (parentId?: string | null) => Promise<void>;
	renameFolder: (id: string, name: string) => Promise<void>;
	deleteFolder: (id: string) => Promise<void>;
	uploadFiles: (list: FileList | File[], noteId?: string | null) => Promise<void>;
	deleteFile: (id: string) => Promise<void>;
	refresh: () => Promise<void>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

const VIEW_ORDER: ViewMode[] = ['edit', 'split', 'preview'];

function readTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'dark';
	return localStorage.getItem('vault-theme') === 'light' ? 'light' : 'dark';
}

export function VaultProvider({ children }: { children: ReactNode }) {
	const [folders, setFolders] = useState<Folder[]>([]);
	const [notes, setNotes] = useState<NoteMeta[]>([]);
	const [files, setFiles] = useState<VaultFile[]>([]);
	const [bodies, setBodies] = useState<Record<string, string>>({});
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
	const [viewMode, setViewModeState] = useState<ViewMode>('split');
	const [theme, setTheme] = useState<Theme>(readTheme);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [rightOpen, setRightOpen] = useState(true);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [searchHits, setSearchHits] = useState<Set<string> | null>(null);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState('Loading vault…');
	const [error, setError] = useState<string | null>(null);

	const bodiesRef = useRef(bodies);
	const notesRef = useRef(notes);
	const dirtyRef = useRef<Set<string>>(new Set());
	const timersRef = useRef<Map<string, number>>(new Map());
	bodiesRef.current = bodies;
	notesRef.current = notes;

	const applyTheme = useCallback((next: Theme) => {
		setTheme(next);
		document.documentElement.dataset.theme = next;
		document.documentElement.style.colorScheme = next;
		localStorage.setItem('vault-theme', next);
	}, []);

	useEffect(() => {
		applyTheme(readTheme());
	}, [applyTheme]);

	const refresh = useCallback(async () => {
		try {
			const [noteRes, folderRes, fileRes] = await Promise.all([
				api.notes(),
				api.folders(),
				api.files(),
			]);
			setNotes(noteRes.notes);
			setFolders(folderRes.folders);
			setFiles(fileRes.files);
			await cacheList(noteRes.notes, folderRes.folders, fileRes.files);
			setError(null);
			setStatus('Synced');
		} catch (err) {
			const cachedNotes = await db.notes.toArray();
			const cachedFolders = await db.folders.toArray();
			const cachedFiles = await db.files.toArray();
			if (cachedNotes.length || cachedFolders.length) {
				setNotes(cachedNotes);
				setFolders(cachedFolders);
				setFiles(cachedFiles);
				const nextBodies: Record<string, string> = {};
				for (const note of cachedNotes) {
					if (note.body) nextBodies[note.id] = note.body;
				}
				setBodies((prev) => ({ ...nextBodies, ...prev }));
				setStatus('Offline cache');
			}
			setError(err instanceof Error ? err.message : 'Failed to sync');
		}
	}, []);

	useEffect(() => {
		void (async () => {
			const cachedNotes = await db.notes.toArray();
			if (cachedNotes.length) {
				setNotes(cachedNotes);
				setFolders(await db.folders.toArray());
				setFiles(await db.files.toArray());
				const nextBodies: Record<string, string> = {};
				for (const note of cachedNotes) {
					if (note.body) nextBodies[note.id] = note.body;
				}
				setBodies(nextBodies);
				setSelectedNoteId(cachedNotes[0]?.id ?? null);
			}
			await refresh();
		})();
	}, [refresh]);

	useEffect(() => {
		if (selectedNoteId) return;
		if (notes[0]) setSelectedNoteId(notes[0].id);
	}, [notes, selectedNoteId]);

	const selectNote = useCallback(async (id: string | null) => {
		setSelectedNoteId(id);
		setSelectedFileId(null);
		setLibraryOpen(false);
		if (!id) return;
		if (bodiesRef.current[id]) return;
		const cached = await db.notes.get(id);
		if (cached?.body) {
			setBodies((prev) => ({ ...prev, [id]: cached.body }));
		}
		try {
			const note = await api.note(id);
			if (!dirtyRef.current.has(id)) {
				setBodies((prev) => ({ ...prev, [id]: note.body }));
				await cacheNoteBody(note);
				setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...note } : n)));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not open note');
		}
	}, []);

	const flushSave = useCallback(async (id?: string) => {
		const targets = id ? [id] : [...dirtyRef.current];
		for (const noteId of targets) {
			const body = bodiesRef.current[noteId];
			if (body === undefined) continue;
			const current = notesRef.current.find((n) => n.id === noteId);
			if (!current) continue;
			const fm = parseFrontmatter(body);
			const title = deriveTitle(body, current.title);
			setSaving(true);
			try {
				const saved = await api.updateNote(noteId, {
					title,
					body,
					tags: fm.tags,
					course: fm.course ?? null,
					folder_id: current.folder_id,
				});
				dirtyRef.current.delete(noteId);
				setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...saved } : n)));
				await db.notes.put({ ...saved, dirty: 0 });
				setStatus('Saved');
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Save failed');
				setStatus('Save failed');
			} finally {
				setSaving(false);
			}
		}
	}, []);

	const updateBody = useCallback(
		(body: string) => {
			if (!selectedNoteId) return;
			setBodies((prev) => ({ ...prev, [selectedNoteId]: body }));
			dirtyRef.current.add(selectedNoteId);
			const title = deriveTitle(body, 'Untitled');
			setNotes((prev) =>
				prev.map((n) => (n.id === selectedNoteId ? { ...n, title } : n)),
			);
			void db.notes.update(selectedNoteId, { body, title, dirty: Date.now() });
			const prevTimer = timersRef.current.get(selectedNoteId);
			if (prevTimer) window.clearTimeout(prevTimer);
			const timer = window.setTimeout(() => {
				void flushSave(selectedNoteId);
			}, 2000);
			timersRef.current.set(selectedNoteId, timer);
			setStatus('Editing…');
		},
		[flushSave, selectedNoteId],
	);

	useEffect(() => {
		const onHide = () => {
			void flushSave();
		};
		document.addEventListener('visibilitychange', onHide);
		window.addEventListener('beforeunload', onHide);
		const onFocus = () => {
			void refresh();
		};
		window.addEventListener('focus', onFocus);
		return () => {
			document.removeEventListener('visibilitychange', onHide);
			window.removeEventListener('beforeunload', onHide);
			window.removeEventListener('focus', onFocus);
		};
	}, [flushSave, refresh]);

	useEffect(() => {
		const q = query.trim();
		if (q.length < 2) {
			setSearchHits(null);
			return;
		}
		const local = new Set(
			notes
				.filter((n) => {
					const hay = `${n.title} ${n.tags.join(' ')} ${n.course ?? ''}`.toLowerCase();
					return hay.includes(q.toLowerCase());
				})
				.map((n) => n.id),
		);
		setSearchHits(local);
		const handle = window.setTimeout(() => {
			void api
				.search(q)
				.then((res) => {
					setSearchHits(new Set([...local, ...res.notes.map((n) => n.id)]));
				})
				.catch(() => {
					/* keep local hits */
				});
		}, 400);
		return () => window.clearTimeout(handle);
	}, [notes, query]);

	const createNote = useCallback(
		async (folderId?: string | null) => {
			const note = await api.createNote({
				folder_id: folderId ?? null,
				title: 'Untitled',
				body: '---\ntitle: Untitled\ntags: []\ncourse:\n---\n\n# Untitled\n\n',
			});
			setNotes((prev) => [note, ...prev]);
			setBodies((prev) => ({ ...prev, [note.id]: note.body }));
			await db.notes.put({ ...note, dirty: 0 });
			setSelectedNoteId(note.id);
			setLibraryOpen(false);
		},
		[],
	);

	const deleteNote = useCallback(
		async (id: string) => {
			await api.deleteNote(id);
			setNotes((prev) => prev.filter((n) => n.id !== id));
			setFiles((prev) => prev.filter((f) => f.note_id !== id));
			setBodies((prev) => {
				const next = { ...prev };
				delete next[id];
				return next;
			});
			await db.notes.delete(id);
			if (selectedNoteId === id) {
				setSelectedNoteId(null);
			}
		},
		[selectedNoteId],
	);

	const renameNote = useCallback(async (id: string, title: string) => {
		const current = notesRef.current.find((n) => n.id === id);
		const body = bodiesRef.current[id] ?? (await api.note(id)).body;
		const nextBody = body.replace(/^---[\s\S]*?---/, (block) =>
			block.replace(/title:\s*.*/i, `title: ${title}`),
		);
		const saved = await api.updateNote(id, {
			title,
			body: nextBody,
			folder_id: current?.folder_id ?? null,
		});
		setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...saved } : n)));
		setBodies((prev) => ({ ...prev, [id]: saved.body }));
	}, []);

	const moveNote = useCallback(async (id: string, folderId: string | null) => {
		const body = bodiesRef.current[id];
		const saved = await api.updateNote(id, { folder_id: folderId, body });
		setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...saved } : n)));
	}, []);

	const createFolder = useCallback(async (parentId?: string | null) => {
		const name = window.prompt('Folder name', 'New folder');
		if (!name) return;
		const folder = await api.createFolder({ name, parent_id: parentId ?? null });
		setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
	}, []);

	const renameFolder = useCallback(async (id: string, name: string) => {
		const folder = await api.updateFolder(id, { name });
		setFolders((prev) => prev.map((f) => (f.id === id ? folder : f)));
	}, []);

	const deleteFolder = useCallback(async (id: string) => {
		await api.deleteFolder(id);
		setFolders((prev) => prev.filter((f) => f.id !== id));
		setNotes((prev) =>
			prev.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n)),
		);
	}, []);

	const uploadFiles = useCallback(
		async (list: FileList | File[], noteId?: string | null) => {
			const filesArr = [...list];
			for (const file of filesArr) {
				try {
					const created = await api.initFile({
						name: file.name,
						mime: file.type || 'application/octet-stream',
						size: file.size,
						note_id: noteId ?? selectedNoteId,
					});
					await uploadBytes(created.id, file, file.type || 'application/octet-stream');
					setFiles((prev) => [
						{ ...created, note_id: noteId ?? selectedNoteId ?? null, size: file.size },
						...prev.filter((f) => f.id !== created.id),
					]);
					setStatus(`Uploaded ${file.name}`);
				} catch (err) {
					setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
				}
			}
		},
		[selectedNoteId],
	);

	const deleteFile = useCallback(async (id: string) => {
		await api.deleteFile(id);
		setFiles((prev) => prev.filter((f) => f.id !== id));
		if (selectedFileId === id) setSelectedFileId(null);
	}, [selectedFileId]);

	const activeNote = useMemo<Note | null>(() => {
		if (!selectedNoteId) return null;
		const meta = notes.find((n) => n.id === selectedNoteId);
		if (!meta) return null;
		return { ...meta, body: bodies[selectedNoteId] ?? '' };
	}, [bodies, notes, selectedNoteId]);

	const value: VaultContextValue = {
		folders,
		notes,
		files,
		selectedNoteId,
		selectedFileId,
		activeNote,
		viewMode,
		theme,
		sidebarOpen,
		rightOpen,
		libraryOpen,
		paletteOpen,
		query,
		searchHits,
		saving,
		status,
		error,
		selectNote,
		selectFile: setSelectedFileId,
		setViewMode: setViewModeState,
		cycleViewMode: () =>
			setViewModeState((mode) => VIEW_ORDER[(VIEW_ORDER.indexOf(mode) + 1) % VIEW_ORDER.length]),
		toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
		setSidebarOpen,
		setRightOpen,
		setLibraryOpen,
		setPaletteOpen,
		setQuery,
		updateBody,
		flushSave,
		createNote,
		deleteNote,
		renameNote,
		moveNote,
		createFolder,
		renameFolder,
		deleteFolder,
		uploadFiles,
		deleteFile,
		refresh,
	};

	return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
	const ctx = useContext(VaultContext);
	if (!ctx) throw new Error('useVault must be used within VaultProvider');
	return ctx;
}
