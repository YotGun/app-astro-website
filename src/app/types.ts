export type Folder = {
	id: string;
	parent_id: string | null;
	name: string;
	created_at: number;
	updated_at: number;
};

export type NoteMeta = {
	id: string;
	folder_id: string | null;
	title: string;
	tags: string[];
	course: string | null;
	created_at: number;
	updated_at: number;
};

export type Note = NoteMeta & {
	body: string;
};

export type VaultFile = {
	id: string;
	note_id: string | null;
	r2_key: string;
	name: string;
	mime: string;
	size: number;
	created_at: number;
};

export type ViewMode = 'edit' | 'split' | 'preview';
export type Theme = 'dark' | 'light';
export type LibraryFilter = 'all' | 'video' | 'image' | 'pdf' | 'other';
