import { error, id, json, now, parseTags, readJson, tagsJson } from './http';
import { WELCOME_BODY } from './seed';

export type NoteRow = {
	id: string;
	folder_id: string | null;
	title: string;
	body: string;
	tags: string;
	course: string | null;
	created_at: number;
	updated_at: number;
};

export type NoteMeta = Omit<NoteRow, 'body'> & { tags: string[] };

function meta(row: Omit<NoteRow, 'body'> & { tags: string }): NoteMeta {
	return {
		...row,
		tags: parseTags(row.tags),
	};
}

async function indexNote(
	db: D1Database,
	note: { id: string; title: string; body: string; tags: string; course: string | null },
) {
	await db
		.prepare('DELETE FROM notes_fts WHERE id = ?')
		.bind(note.id)
		.run();
	await db
		.prepare(
			'INSERT INTO notes_fts (id, title, body, tags, course) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(note.id, note.title, note.body, note.tags, note.course ?? '')
		.run();
}

export async function seedIfEmpty(db: D1Database): Promise<void> {
	const count = await db.prepare('SELECT COUNT(*) AS n FROM notes').first<{ n: number }>();
	if ((count?.n ?? 0) > 0) return;

	const ts = now();
	const folderId = id();
	const noteId = id();
	const tags = tagsJson(['meta', 'getting-started']);

	await db.batch([
		db
			.prepare(
				'INSERT INTO folders (id, parent_id, name, created_at, updated_at) VALUES (?, NULL, ?, ?, ?)',
			)
			.bind(folderId, 'Getting started', ts, ts),
		db
			.prepare(
				`INSERT INTO notes (id, folder_id, title, body, tags, course, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
			)
			.bind(noteId, folderId, 'Welcome', WELCOME_BODY, tags, ts, ts),
	]);
	await indexNote(db, {
		id: noteId,
		title: 'Welcome',
		body: WELCOME_BODY,
		tags,
		course: null,
	});
}

export async function listNotes(env: Env): Promise<Response> {
	await seedIfEmpty(env.DB);
	const rows = await env.DB.prepare(
		`SELECT id, folder_id, title, tags, course, created_at, updated_at
		 FROM notes
		 ORDER BY updated_at DESC`,
	).all<Omit<NoteRow, 'body'>>();

	return json({ notes: (rows.results ?? []).map(meta) });
}

export async function getNote(env: Env, noteId: string): Promise<Response> {
	const row = await env.DB.prepare('SELECT * FROM notes WHERE id = ?')
		.bind(noteId)
		.first<NoteRow>();
	if (!row) return error('Note not found', 404);
	return json({ ...row, tags: parseTags(row.tags) });
}

export async function createNote(env: Env, request: Request): Promise<Response> {
	const body = await readJson<{
		folder_id?: string | null;
		title?: string;
		body?: string;
		tags?: string[];
		course?: string | null;
	}>(request);

	const ts = now();
	const noteId = id();
	const title = (body.title ?? 'Untitled').trim() || 'Untitled';
	const markdown = body.body ?? '';
	const tags = tagsJson(parseTags(body.tags));
	const course = body.course?.trim() || null;
	const folderId = body.folder_id ?? null;

	await env.DB.prepare(
		`INSERT INTO notes (id, folder_id, title, body, tags, course, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(noteId, folderId, title, markdown, tags, course, ts, ts)
		.run();

	await indexNote(env.DB, { id: noteId, title, body: markdown, tags, course });

	return json(
		{
			id: noteId,
			folder_id: folderId,
			title,
			body: markdown,
			tags: parseTags(tags),
			course,
			created_at: ts,
			updated_at: ts,
		},
		201,
	);
}

export async function updateNote(env: Env, noteId: string, request: Request): Promise<Response> {
	const existing = await env.DB.prepare('SELECT * FROM notes WHERE id = ?')
		.bind(noteId)
		.first<NoteRow>();
	if (!existing) return error('Note not found', 404);

	const patch = await readJson<{
		folder_id?: string | null;
		title?: string;
		body?: string;
		tags?: string[];
		course?: string | null;
	}>(request);

	const title = (patch.title ?? existing.title).trim() || 'Untitled';
	const markdown = patch.body ?? existing.body;
	const tags = patch.tags ? tagsJson(parseTags(patch.tags)) : existing.tags;
	const course =
		patch.course === undefined ? existing.course : patch.course?.trim() || null;
	const folderId = patch.folder_id === undefined ? existing.folder_id : patch.folder_id;
	const ts = now();

	await env.DB.prepare(
		`UPDATE notes
		 SET folder_id = ?, title = ?, body = ?, tags = ?, course = ?, updated_at = ?
		 WHERE id = ?`,
	)
		.bind(folderId, title, markdown, tags, course, ts, noteId)
		.run();

	await indexNote(env.DB, { id: noteId, title, body: markdown, tags, course });

	return json({
		id: noteId,
		folder_id: folderId,
		title,
		body: markdown,
		tags: parseTags(tags),
		course,
		created_at: existing.created_at,
		updated_at: ts,
	});
}

export async function deleteNote(env: Env, noteId: string): Promise<Response> {
	const existing = await env.DB.prepare('SELECT id FROM notes WHERE id = ?')
		.bind(noteId)
		.first();
	if (!existing) return error('Note not found', 404);

	const files = await env.DB.prepare('SELECT id, r2_key FROM files WHERE note_id = ?')
		.bind(noteId)
		.all<{ id: string; r2_key: string }>();

	for (const file of files.results ?? []) {
		await env.BUCKET.delete(file.r2_key);
	}

	await env.DB.batch([
		env.DB.prepare('DELETE FROM files WHERE note_id = ?').bind(noteId),
		env.DB.prepare('DELETE FROM notes_fts WHERE id = ?').bind(noteId),
		env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId),
	]);

	return json({ ok: true });
}
