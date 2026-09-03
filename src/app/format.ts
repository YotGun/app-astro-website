export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** exp;
	return `${value < 10 && exp > 0 ? value.toFixed(1) : Math.round(value)} ${units[exp]}`;
}

export function formatDate(ms: number): string {
	if (!ms) return '';
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(ms);
}

export function fileKind(mime: string, name = ''): 'image' | 'video' | 'audio' | 'pdf' | 'note' | 'other' {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	if (mime.startsWith('audio/')) return 'audio';
	if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
	return 'other';
}

export function extOf(name: string): string {
	const parts = name.split('.');
	return parts.length > 1 ? parts.pop()!.toLowerCase() : 'file';
}

export function folderPath(folders: Array<{ id: string; parent_id: string | null; name: string }>, id: string | null): string {
	if (!id) return 'My Drive';
	const names: string[] = [];
	let cursor: string | null = id;
	const seen = new Set<string>();
	while (cursor && !seen.has(cursor)) {
		seen.add(cursor);
		const folder = folders.find((f) => f.id === cursor);
		if (!folder) break;
		names.unshift(folder.name);
		cursor = folder.parent_id;
	}
	return names.join(' / ') || 'My Drive';
}
