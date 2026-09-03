/// <reference path="../worker-configuration.d.ts" />
import { createFolder, deleteFolder, listFolders, updateFolder } from './folders';
import { attachFile, deleteFile, getFileContent, initFile, listFiles, putFileContent } from './files';
import { error, json } from './http';
import { createNote, deleteNote, getNote, listNotes, updateNote } from './notes';
import { searchNotes } from './search';

const NOTE_ID = /^\/api\/notes\/([^/]+)$/;
const FOLDER_ID = /^\/api\/folders\/([^/]+)$/;
const FILE_ID = /^\/api\/files\/([^/]+)$/;
const FILE_CONTENT = /^\/api\/files\/([^/]+)\/content$/;

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const method = request.method.toUpperCase();

		if (method === 'OPTIONS') {
			return new Response(null, { status: 204 });
		}

		try {
			if (pathname === '/api/health' && method === 'GET') {
				return json({ ok: true });
			}

			if (pathname === '/api/notes' && method === 'GET') return listNotes(env);
			if (pathname === '/api/notes' && method === 'POST') return createNote(env, request);
			if (pathname === '/api/folders' && method === 'GET') return listFolders(env);
			if (pathname === '/api/folders' && method === 'POST') return createFolder(env, request);
			if (pathname === '/api/files' && method === 'GET') return listFiles(env, url);
			if (pathname === '/api/files' && method === 'POST') return initFile(env, request);
			if (pathname === '/api/search' && method === 'GET') return searchNotes(env, url);

			const note = NOTE_ID.exec(pathname);
			if (note) {
				const id = decodeURIComponent(note[1]);
				if (method === 'GET') return getNote(env, id);
				if (method === 'PUT') return updateNote(env, id, request);
				if (method === 'DELETE') return deleteNote(env, id);
			}

			const folder = FOLDER_ID.exec(pathname);
			if (folder) {
				const id = decodeURIComponent(folder[1]);
				if (method === 'PATCH' || method === 'PUT') return updateFolder(env, id, request);
				if (method === 'DELETE') return deleteFolder(env, id);
			}

			const content = FILE_CONTENT.exec(pathname);
			if (content) {
				const id = decodeURIComponent(content[1]);
				if (method === 'GET' || method === 'HEAD') {
					const response = await getFileContent(env, id, request);
					if (method === 'HEAD') {
						return new Response(null, { status: response.status, headers: response.headers });
					}
					return response;
				}
				if (method === 'PUT') return putFileContent(env, id, request);
			}

			const file = FILE_ID.exec(pathname);
			if (file) {
				const id = decodeURIComponent(file[1]);
				if (method === 'PATCH') return attachFile(env, id, request);
				if (method === 'DELETE') return deleteFile(env, id);
			}

			return error('Not found', 404);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Internal error';
			console.error(message);
			return error(message, 500);
		}
	},
} satisfies ExportedHandler<Env>;
