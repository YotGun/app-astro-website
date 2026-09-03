import Dexie, { type Table } from 'dexie';
import type { Folder, Note, NoteMeta, VaultFile } from './types';

export type CachedNote = Note & { dirty?: number };

class VaultDB extends Dexie {
	notes!: Table<CachedNote, string>;
	folders!: Table<Folder, string>;
	files!: Table<VaultFile, string>;

	constructor() {
		super('vault-db');
		this.version(1).stores({
			notes: 'id, folder_id, updated_at, dirty',
			folders: 'id, parent_id, name',
			files: 'id, note_id, created_at',
		});
	}
}

export const db = new VaultDB();

export async function cacheList(notes: NoteMeta[], folders: Folder[], files: VaultFile[]) {
	await db.transaction('rw', db.notes, db.folders, db.files, async () => {
		const existing = await db.notes.toArray();
		const incoming = new Map(notes.map((n) => [n.id, n]));

		for (const local of existing) {
			const remote = incoming.get(local.id);
			if (!remote) {
				if (!local.dirty) await db.notes.delete(local.id);
				continue;
			}
			if ((local.dirty ?? 0) > 0) continue;
			if (remote.updated_at > local.updated_at || !local.body) {
				await db.notes.put({
					...local,
					...remote,
					body: local.body ?? '',
				});
			}
		}

		for (const remote of notes) {
			const local = existing.find((n) => n.id === remote.id);
			if (!local) {
				await db.notes.put({ ...remote, body: '', dirty: 0 });
			}
		}

		await db.folders.clear();
		await db.folders.bulkPut(folders);
		await db.files.clear();
		await db.files.bulkPut(files);
	});
}

export async function cacheNoteBody(note: Note) {
	const local = await db.notes.get(note.id);
	if (local && (local.dirty ?? 0) > 0) return;
	await db.notes.put({ ...note, dirty: 0 });
}
