import { error, id, json, now, readJson } from './http';

export type FileRow = {
	id: string;
	note_id: string | null;
	r2_key: string;
	name: string;
	mime: string;
	size: number;
	created_at: number;
};

const MAX_SINGLE_UPLOAD = 95 * 1024 * 1024;

export async function listFiles(env: Env, url: URL): Promise<Response> {
	const noteId = url.searchParams.get('note_id');
	const rows = noteId
		? await env.DB.prepare(
				'SELECT * FROM files WHERE note_id = ? ORDER BY created_at DESC',
			)
				.bind(noteId)
				.all<FileRow>()
		: await env.DB.prepare('SELECT * FROM files ORDER BY created_at DESC').all<FileRow>();

	return json({ files: rows.results ?? [] });
}

export async function initFile(env: Env, request: Request): Promise<Response> {
	const body = await readJson<{
		name?: string;
		mime?: string;
		size?: number;
		note_id?: string | null;
	}>(request);

	const name = (body.name ?? 'untitled').trim() || 'untitled';
	const mime = body.mime || 'application/octet-stream';
	const size = Number(body.size ?? 0);
	const noteId = body.note_id ?? null;
	if (noteId) {
		const note = await env.DB.prepare('SELECT id FROM notes WHERE id = ?').bind(noteId).first();
		if (!note) return error('Note not found', 404);
	}
	const fileId = id();
	const key = `files/${fileId}/${name}`;
	const ts = now();

	await env.DB.prepare(
		`INSERT INTO files (id, note_id, r2_key, name, mime, size, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(fileId, noteId, key, name, mime, size, ts)
		.run();

	return json(
		{
			id: fileId,
			note_id: noteId,
			r2_key: key,
			name,
			mime,
			size,
			created_at: ts,
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
			`File is larger than ${MAX_SINGLE_UPLOAD} bytes. Split the lecture or compress it first.`,
			413,
		);
	}

	if (!request.body) return error('Empty body', 400);

	const put = await env.BUCKET.put(file.r2_key, request.body, {
		httpMetadata: { contentType },
	});

	const size = Number(lengthHeader ?? put.size ?? file.size);
	await env.DB.prepare('UPDATE files SET mime = ?, size = ? WHERE id = ?')
		.bind(contentType, size, fileId)
		.run();

	return json({
		...file,
		mime: contentType,
		size,
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

	const rangeHeader = request.headers.get('Range');
	let range: { offset: number; length: number } | undefined;
	let start = 0;
	let end = file.size > 0 ? file.size - 1 : 0;

	if (rangeHeader) {
		const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
		if (match) {
			start = Number(match[1]);
			end = match[2] ? Number(match[2]) : file.size > 0 ? file.size - 1 : start;
			range = { offset: start, length: Math.max(0, end - start + 1) };
		}
	}

	const object = await env.BUCKET.get(file.r2_key, range ? { range } : undefined);
	if (!object) return error('Object missing from storage', 404);

	const headers = new Headers();
	headers.set('Content-Type', file.mime);
	headers.set('Accept-Ranges', 'bytes');
	headers.set('Cache-Control', 'private, max-age=3600');
	headers.set(
		'Content-Disposition',
		`inline; filename="${encodeURIComponent(file.name)}"`,
	);
	if (object.httpEtag) headers.set('ETag', object.httpEtag);

	if (range) {
		const total = file.size || object.size;
		const served = 'length' in (range as { length?: number }) ? range.length : object.size;
		const last = start + (served ?? object.size) - 1;
		headers.set('Content-Range', `bytes ${start}-${last}/${total}`);
		headers.set('Content-Length', String((served ?? object.size) || 0));
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

export async function attachFile(env: Env, fileId: string, request: Request): Promise<Response> {
	const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?')
		.bind(fileId)
		.first<FileRow>();
	if (!file) return error('File not found', 404);
	const body = await readJson<{ note_id?: string | null }>(request);
	await env.DB.prepare('UPDATE files SET note_id = ? WHERE id = ?')
		.bind(body.note_id ?? null, fileId)
		.run();
	return json({ ...file, note_id: body.note_id ?? null });
}
