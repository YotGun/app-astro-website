import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useVault } from '../VaultProvider';
import { fileKind } from '../format';
import {
	IconCheck,
	IconFolder,
	IconGrid,
	IconMoon,
	IconNote,
	IconPanel,
	IconPlus,
	IconSearch,
	kindIcon,
} from './Icons';

type Command = {
	id: string;
	label: string;
	hint?: string;
	Icon: ComponentType<SVGProps<SVGSVGElement>>;
	run: () => void;
};

export function CommandPalette() {
	const vault = useVault();
	const [active, setActive] = useState(0);
	const [text, setText] = useState('');

	const commands = useMemo<Command[]>(() => {
		const base: Command[] = [
			{ id: 'note', label: 'New note', hint: 'N', Icon: IconPlus, run: () => void vault.createNote(null) },
			{ id: 'folder', label: 'New folder', Icon: IconFolder, run: () => void vault.createFolder(null) },
			{ id: 'theme', label: 'Toggle theme', Icon: IconMoon, run: () => vault.toggleTheme() },
			{ id: 'view', label: 'Cycle editor view', hint: '⇧V', Icon: IconPanel, run: () => vault.cycleViewMode() },
			{
				id: 'sidebar',
				label: 'Toggle sidebar',
				hint: '⌘\\',
				Icon: IconPanel,
				run: () => vault.setSidebarOpen(!vault.sidebarOpen),
			},
			{ id: 'library', label: 'Open Drive', Icon: IconGrid, run: () => vault.setAppMode('drive') },
			{ id: 'notes', label: 'Open Notes', Icon: IconNote, run: () => vault.setAppMode('notes') },
			{ id: 'save', label: 'Save current note', hint: '⌘S', Icon: IconCheck, run: () => void vault.flushSave() },
		];
		const notes: Command[] = vault.notes.map((note) => ({
			id: `open-${note.id}`,
			label: `Open “${note.title}”`,
			Icon: IconNote,
			run: () => void vault.selectNote(note.id),
		}));
		const files: Command[] = vault.files.map((file) => ({
			id: `file-${file.id}`,
			label: `Open file “${file.name}”`,
			Icon: kindIcon(fileKind(file.mime, file.name)),
			run: () => {
				vault.setAppMode('drive');
				vault.setDriveFolderId(file.folder_id);
				vault.selectFile(file.id);
			},
		}));
		return [...base, ...notes, ...files];
	}, [vault]);

	const filtered = commands.filter((c) =>
		c.label.toLowerCase().includes(text.trim().toLowerCase()),
	);
	const current = filtered[Math.min(active, Math.max(filtered.length - 1, 0))];

	useEffect(() => {
		setActive(0);
	}, [text, vault.paletteOpen]);

	useEffect(() => {
		if (!vault.paletteOpen) setText('');
	}, [vault.paletteOpen]);

	if (!vault.paletteOpen) return null;

	return (
		<div
			className="palette-backdrop"
			onMouseDown={() => vault.setPaletteOpen(false)}
		>
			<div
				className="palette"
				role="dialog"
				aria-label="Command palette"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="palette-field">
					<IconSearch />
					<input
						autoFocus
						value={text}
						placeholder="Search commands, notes and files…"
						onChange={(e) => setText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') vault.setPaletteOpen(false);
							if (e.key === 'ArrowDown') {
								e.preventDefault();
								setActive((i) => Math.min(i + 1, filtered.length - 1));
							}
							if (e.key === 'ArrowUp') {
								e.preventDefault();
								setActive((i) => Math.max(i - 1, 0));
							}
							if (e.key === 'Enter' && current) {
								e.preventDefault();
								current.run();
								vault.setPaletteOpen(false);
							}
						}}
					/>
				</div>
				{filtered.length === 0 ? (
					<p className="palette-empty muted">No matches for “{text.trim()}”.</p>
				) : (
					<ul>
						{filtered.slice(0, 20).map((command, index) => (
							<li key={command.id}>
								<button
									type="button"
									className={command === current ? 'active' : ''}
									onMouseEnter={() => setActive(index)}
									onClick={() => {
										command.run();
										vault.setPaletteOpen(false);
									}}
								>
									<command.Icon />
									<span>{command.label}</span>
									{command.hint && <kbd>{command.hint}</kbd>}
								</button>
							</li>
						))}
					</ul>
				)}
				<footer className="palette-foot">
					<span>
						<kbd>↑</kbd>
						<kbd>↓</kbd> navigate
					</span>
					<span>
						<kbd>↵</kbd> open
					</span>
					<span>
						<kbd>esc</kbd> close
					</span>
				</footer>
			</div>
		</div>
	);
}
