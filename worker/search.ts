import { json, parseTags } from './http';

export async function searchNotes(env: Env, url: URL): Promise<Response> {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return json({ notes: [] });

	const tokens = q
		.replace(/['"^:*()]/g, ' ')
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.slice(0, 8);

	if (tokens.length === 0) return json({ notes: [] });

	const match = tokens.map((t) => `"${t}"*`).join(' AND ');

	const rows = await env.DB.prepare(
		`SELECT notes.id, notes.folder_id, notes.title, notes.tags, notes.course, notes.created_at, notes.updated_at
		 FROM notes_fts
		 JOIN notes ON notes.id = notes_fts.id
		 WHERE notes_fts MATCH ?
		 ORDER BY rank
		 LIMIT 40`,
	)
		.bind(match)
		.all();

	return json({
		notes: (rows.results ?? []).map((row) => ({
			...row,
			tags: parseTags((row as { tags: string }).tags),
		})),
	});
}
