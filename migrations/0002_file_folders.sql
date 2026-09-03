ALTER TABLE files ADD COLUMN folder_id TEXT;
ALTER TABLE files ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_files_folder ON files(folder_id);

UPDATE files SET updated_at = created_at WHERE updated_at = 0;

UPDATE files
SET folder_id = (
	SELECT notes.folder_id FROM notes WHERE notes.id = files.note_id
)
WHERE note_id IS NOT NULL AND folder_id IS NULL;
