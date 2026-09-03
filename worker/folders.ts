import { error, id, json, now, readJson } from './http';

export type FolderRow = {
	id: string;
	parent_id: string | null;
	name: string;
	created_at: number;
	updated_at: number;
};

export async function listFolders(env: Env): Promise<Response> {
	const rows = await env.DB.prepare(
		'SELECT id, parent_id, name, created_at, updated_at FROM folders ORDER BY name COLLATE NOCASE',
	).all<FolderRow>();
	return json({ folders: rows.results ?? [] });
}

export async function createFolder(env: Env, request: Request): Promise<Response> {
	const body = await readJson<{ name?: string; parent_id?: string | null }>(request);
	const name = (body.name ?? 'Untitled folder').trim() || 'Untitled folder';
	const ts = now();
	const folderId = id();
	const parentId = body.parent_id ?? null;

	await env.DB.prepare(
		'INSERT INTO folders (id, parent_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
	)
		.bind(folderId, parentId, name, ts, ts)
		.run();

	return json(
		{ id: folderId, parent_id: parentId, name, created_at: ts, updated_at: ts },
		201,
	);
}

export async function updateFolder(env: Env, folderId: string, request: Request): Promise<Response> {
	const existing = await env.DB.prepare('SELECT * FROM folders WHERE id = ?')
		.bind(folderId)
		.first<FolderRow>();
	if (!existing) return error('Folder not found', 404);

	const patch = await readJson<{ name?: string; parent_id?: string | null }>(request);
	const name = (patch.name ?? existing.name).trim() || existing.name;
	const parentId = patch.parent_id === undefined ? existing.parent_id : patch.parent_id;
	const ts = now();

	await env.DB.prepare(
		'UPDATE folders SET name = ?, parent_id = ?, updated_at = ? WHERE id = ?',
	)
		.bind(name, parentId, ts, folderId)
		.run();

	return json({
		id: folderId,
		parent_id: parentId,
		name,
		created_at: existing.created_at,
		updated_at: ts,
	});
}

export async function deleteFolder(env: Env, folderId: string): Promise<Response> {
	const existing = await env.DB.prepare('SELECT id FROM folders WHERE id = ?')
		.bind(folderId)
		.first();
	if (!existing) return error('Folder not found', 404);

	await env.DB.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?')
		.bind(folderId)
		.run();
	await env.DB.prepare('DELETE FROM folders WHERE id = ?').bind(folderId).run();
	return json({ ok: true });
}
