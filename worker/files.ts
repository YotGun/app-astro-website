import { error, id, json, now, readJson } from './http';

export type FileRow = {
	id: string;
	note_id: string | null;
	folder_id: string | null;
	r2_key: string;
	name: string;
	mime: string;
	size: number;
	created_at: number;
	updated_at: number;
};

const MAX_SINGLE_UPLOAD = 95 * 1024 * 1024;

function disposition(name: string, inline: boolean): string {
	const safe = name.replace(/["\r\n]/g, '_');
	const encoded = encodeURIComponent(name);
	const mode = inline ? 'inline' : 'attachment';
	return `${mode}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function listFiles(env: Env, url: URL): Promise<Response> {
	const noteId = url.searchParams.get('note_id');
	const folderId = url.searchParams.get('folder_id');
	let rows;
	if (noteId) {
		rows = await env.DB.prepare(
			'SELECT * FROM files WHERE note_id = ? ORDER BY name COLLATE NOCASE',
		)
			.bind(noteId)
			.all<FileRow>();
	} else if (folderId === 'root') {
		rows = await env.DB.prepare(
			'SELECT * FROM files WHERE folder_id IS NULL ORDER BY name COLLATE NOCASE',
		).all<FileRow>();
	} else if (folderId) {
		rows = await env.DB.prepare(
			'SELECT * FROM files WHERE folder_id = ? ORDER BY name COLLATE NOCASE',
		)
			.bind(folderId)
			.all<FileRow>();
	} else {
		rows = await env.DB.prepare('SELECT * FROM files ORDER BY name COLLATE NOCASE').all<FileRow>();
	}

	return json({ files: rows.results ?? [] });
}

export async function initFile(env: Env, request: Request): Promise<Response> {
	const body = await readJson<{
		name?: string;
		mime?: string;
		size?: number;
		note_id?: string | null;
		folder_id?: string | null;
	}>(request);

	const name = (body.name ?? 'untitled').trim() || 'untitled';
	const mime = body.mime || 'application/octet-stream';
	const size = Number(body.size ?? 0);
	let noteId = body.note_id ?? null;
	let folderId = body.folder_id ?? null;

	if (noteId) {
		const note = await env.DB.prepare('SELECT id, folder_id FROM notes WHERE id = ?')
			.bind(noteId)
			.first<{ id: string; folder_id: string | null }>();
		if (!note) return error('Note not found', 404);
		if (!folderId) folderId = note.folder_id;
	}
	if (folderId) {
		const folder = await env.DB.prepare('SELECT id FROM folders WHERE id = ?')
			.bind(folderId)
			.first();
		if (!folder) return error('Folder not found', 404);
	}

	const fileId = id();
	const key = `files/${fileId}/${name}`;
	const ts = now();

	await env.DB.prepare(
		`INSERT INTO files (id, note_id, folder_id, r2_key, name, mime, size, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(fileId, noteId, folderId, key, name, mime, size, ts, ts)
		.run();

	return json(
		{
			id: fileId,
			note_id: noteId,
			folder_id: folderId,
			r2_key: key,
			name,
			mime,
			size,
			created_at: ts,
			updated_at: ts,
			max_single_bytes: MAX_SINGLE_UPLOAD,
		},
		201,
	);
}

export async function putFileContent(
	env: Env,
	fileId: string,
	request: Request,
): Promise<Response> {
	const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?')
		.bind(fileId)
		.first<FileRow>();
	if (!file) return error('File not found', 404);

	const contentType = request.headers.get('Content-Type') || file.mime;
	const lengthHeader = request.headers.get('Content-Length');
	if (lengthHeader && Number(lengthHeader) > MAX_SINGLE_UPLOAD) {
		return error(
			`File is larger than ${MAX_SINGLE_UPLOAD} bytes. Compress or split it first.`,
			413,
		);
	}

	if (!request.body) return error('Empty body', 400);

	const put = await env.BUCKET.put(file.r2_key, request.body, {
		httpMetadata: { contentType },
	});

	const size = Number(lengthHeader ?? put.size ?? file.size);
	const ts = now();
	await env.DB.prepare('UPDATE files SET mime = ?, size = ?, updated_at = ? WHERE id = ?')
		.bind(contentType, size, ts, fileId)
		.run();

	return json({
		...file,
		mime: contentType,
		size,
		updated_at: ts,
	});
}

export async function getFileContent(
	env: Env,
	fileId: string,
	request: Request,
): Promise<Response> {
	const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?')
		.bind(fileId)
		.first<FileRow>();
	if (!file) return error('File not found', 404);

	const download = new URL(request.url).searchParams.get('download') === '1';
	const rangeHeader = request.headers.get('Range');
	let range: { offset: number; length: number } | undefined;
	let start = 0;

	if (rangeHeader && !download) {
		const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
		if (match) {
			start = Number(match[1]);
			const end = match[2] ? Number(match[2]) : file.size > 0 ? file.size - 1 : start;
			range = { offset: start, length: Math.max(0, end - start + 1) };
		}
	}

	const object = await env.BUCKET.get(file.r2_key, range ? { range } : undefined);
	if (!object) return error('Object missing from storage', 404);

	const headers = new Headers();
	headers.set('Content-Type', file.mime || 'application/octet-stream');
	headers.set('Accept-Ranges', 'bytes');
	headers.set('Cache-Control', 'private, max-age=3600');
	headers.set('Content-Disposition', disposition(file.name, !download));
	if (object.httpEtag) headers.set('ETag', object.httpEtag);

	if (range) {
		const total = file.size || object.size;
		const served = range.length;
		const last = start + served - 1;
		headers.set('Content-Range', `bytes ${start}-${last}/${total}`);
		headers.set('Content-Length', String(served || 0));
		return new Response(object.body, { status: 206, headers });
	}

	headers.set('Content-Length', String(file.size || object.size));
	return new Response(object.body, { status: 200, headers });
}

export async function deleteFile(env: Env, fileId: string): Promise<Response> {
	const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?')
		.bind(fileId)
		.first<FileRow>();
	if (!file) return error('File not found', 404);
	await env.BUCKET.delete(file.r2_key);
	await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();
	return json({ ok: true });
}

export async function updateFile(env: Env, fileId: string, request: Request): Promise<Response> {
	const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?')
		.bind(fileId)
		.first<FileRow>();
	if (!file) return error('File not found', 404);
	const body = await readJson<{
		note_id?: string | null;
		folder_id?: string | null;
		name?: string;
	}>(request);

	const name = (body.name ?? file.name).trim() || file.name;
	const noteId = body.note_id === undefined ? file.note_id : body.note_id;
	const folderId = body.folder_id === undefined ? file.folder_id : body.folder_id;
	const ts = now();

	await env.DB.prepare(
		'UPDATE files SET note_id = ?, folder_id = ?, name = ?, updated_at = ? WHERE id = ?',
	)
		.bind(noteId, folderId, name, ts, fileId)
		.run();

	return json({ ...file, note_id: noteId, folder_id: folderId, name, updated_at: ts });
}
