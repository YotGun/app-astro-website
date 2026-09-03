import { useEffect, useMemo, useState } from 'react';
import { useVault } from '../VaultProvider';

type Command = {
	id: string;
	label: string;
	hint?: string;
	run: () => void;
};

export function CommandPalette() {
	const vault = useVault();
	const [active, setActive] = useState(0);
	const [text, setText] = useState('');

	const commands = useMemo<Command[]>(() => {
		const base: Command[] = [
			{ id: 'note', label: 'New note', hint: 'N', run: () => void vault.createNote(null) },
			{ id: 'folder', label: 'New folder', run: () => void vault.createFolder(null) },
			{ id: 'theme', label: 'Toggle theme', run: () => vault.toggleTheme() },
			{ id: 'view', label: 'Cycle editor view', hint: '⇧V', run: () => vault.cycleViewMode() },
			{ id: 'sidebar', label: 'Toggle sidebar', run: () => vault.setSidebarOpen(!vault.sidebarOpen) },
			{ id: 'library', label: 'Open file library', run: () => vault.setLibraryOpen(true) },
			{ id: 'save', label: 'Save current note', hint: '⌘S', run: () => void vault.flushSave() },
		];
		const notes = vault.notes.map((note) => ({
			id: `open-${note.id}`,
			label: `Open “${note.title}”`,
			run: () => void vault.selectNote(note.id),
		}));
		return [...base, ...notes];
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
				<input
					autoFocus
					value={text}
					placeholder="Search commands and notes…"
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
								<span>{command.label}</span>
								{command.hint && <kbd>{command.hint}</kbd>}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
