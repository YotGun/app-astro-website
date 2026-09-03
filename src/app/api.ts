async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: {
			Accept: 'application/json',
			...(init?.body instanceof FormData || init?.body instanceof Blob || init?.body instanceof File
				? init.headers
				: { 'Content-Type': 'application/json', ...init?.headers }),
		},
	});

	if (!response.ok) {
		let message = response.statusText;
		try {
			const payload = (await response.json()) as { error?: string };
			if (payload.error) message = payload.error;
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

export const api = {
	health: () => request<{ ok: boolean }>('/api/health'),
	notes: () => request<{ notes: import('./types').NoteMeta[] }>('/api/notes'),
	note: (id: string) => request<import('./types').Note>(`/api/notes/${id}`),
	createNote: (body: Partial<import('./types').Note>) =>
		request<import('./types').Note>('/api/notes', { method: 'POST', body: JSON.stringify(body) }),
	updateNote: (id: string, body: Partial<import('./types').Note>) =>
		request<import('./types').Note>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
	deleteNote: (id: string) => request<{ ok: boolean }>(`/api/notes/${id}`, { method: 'DELETE' }),
	folders: () => request<{ folders: import('./types').Folder[] }>('/api/folders'),
	createFolder: (body: { name: string; parent_id?: string | null }) =>
		request<import('./types').Folder>('/api/folders', { method: 'POST', body: JSON.stringify(body) }),
	updateFolder: (id: string, body: { name?: string; parent_id?: string | null }) =>
		request<import('./types').Folder>(`/api/folders/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(body),
		}),
	deleteFolder: (id: string) => request<{ ok: boolean }>(`/api/folders/${id}`, { method: 'DELETE' }),
	files: (noteId?: string | null) =>
		request<{ files: import('./types').VaultFile[] }>(
			noteId ? `/api/files?note_id=${encodeURIComponent(noteId)}` : '/api/files',
		),
	initFile: (body: { name: string; mime: string; size: number; note_id?: string | null }) =>
		request<import('./types').VaultFile & { max_single_bytes: number }>('/api/files', {
			method: 'POST',
			body: JSON.stringify(body),
		}),
	deleteFile: (id: string) => request<{ ok: boolean }>(`/api/files/${id}`, { method: 'DELETE' }),
	search: (q: string) =>
		request<{ notes: import('./types').NoteMeta[] }>(`/api/search?q=${encodeURIComponent(q)}`),
};

export function fileContentUrl(id: string): string {
	return `/api/files/${id}/content`;
}

export async function uploadBytes(id: string, file: Blob, mime: string): Promise<void> {
	const response = await fetch(fileContentUrl(id), {
		method: 'PUT',
		headers: { 'Content-Type': mime || 'application/octet-stream' },
		body: file,
	});
	if (!response.ok) {
		let message = response.statusText;
		try {
			const payload = (await response.json()) as { error?: string };
			if (payload.error) message = payload.error;
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}
}
