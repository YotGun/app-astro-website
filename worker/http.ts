export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
	const headers = new Headers(extra);
	headers.set('Content-Type', 'application/json; charset=utf-8');
	headers.set('Cache-Control', 'no-store');
	return new Response(JSON.stringify(data), { status, headers });
}

export function error(message: string, status = 400): Response {
	return json({ error: message }, status);
}

export async function readJson<T>(request: Request): Promise<T> {
	return (await request.json()) as T;
}

export function now(): number {
	return Date.now();
}

export function id(): string {
	return crypto.randomUUID();
}

export function parseTags(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((t) => String(t).trim()).filter(Boolean);
	}
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				return parsed.map((t) => String(t).trim()).filter(Boolean);
			}
		} catch {
			return value
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
		}
	}
	return [];
}

export function tagsJson(tags: string[]): string {
	return JSON.stringify([...new Set(tags.map((t) => t.trim()).filter(Boolean))]);
}
