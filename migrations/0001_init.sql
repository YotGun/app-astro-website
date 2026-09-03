-- Folders
CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	parent_id TEXT,
	name TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_parent ON folders(parent_id);

-- Notes (body lives here; files/videos live in R2)
CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	folder_id TEXT,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	tags TEXT NOT NULL DEFAULT '[]',
	course TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

CREATE VIRTUAL TABLE notes_fts USING fts5(
	id UNINDEXED,
	title,
	body,
	tags,
	course
);

-- File metadata; bytes are in R2 under r2_key
CREATE TABLE files (
	id TEXT PRIMARY KEY,
	note_id TEXT,
	r2_key TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	mime TEXT NOT NULL,
	size INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_note ON files(note_id);
CREATE INDEX idx_files_created ON files(created_at DESC);
