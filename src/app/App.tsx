import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import { useEffect } from 'react';
import { VaultProvider, useVault } from './VaultProvider';
import { CommandPalette } from './components/CommandPalette';
import { DialogHost } from './components/Dialog';
import { EditorPane } from './components/EditorPane';
import { FileLibrary } from './components/FileLibrary';
import { FileViewer } from './components/FileViewer';
import {
	IconAlert,
	IconMoon,
	IconPanel,
	IconSearch,
	IconSun,
	IconVault,
} from './components/Icons';
import { RightPane } from './components/RightPane';
import { Sidebar } from './components/Sidebar';

function Shell() {
	const vault = useVault();

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const meta = event.metaKey || event.ctrlKey;
			if (meta && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				vault.setPaletteOpen(!vault.paletteOpen);
			}
			if (meta && event.key.toLowerCase() === 's') {
				event.preventDefault();
				void vault.flushSave();
			}
			if (meta && event.key === '\\') {
				event.preventDefault();
				vault.setSidebarOpen(!vault.sidebarOpen);
			}
			if (meta && event.shiftKey && event.key.toLowerCase() === 'v') {
				event.preventDefault();
				vault.cycleViewMode();
			}
			if (event.key === 'Escape') vault.setPaletteOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [vault]);

	const activeTitle = vault.activeNote?.title;
	useEffect(() => {
		document.title =
			vault.appMode === 'drive' ? 'Drive · Vault' : activeTitle ? `${activeTitle} · Vault` : 'Vault';
	}, [activeTitle, vault.appMode]);

	return (
		<div className="app-shell">
			<header className="topbar">
				<div className="brand">
					<button
						type="button"
						className="icon-btn"
						title="Toggle sidebar (⌘\)"
						onClick={() => vault.setSidebarOpen(!vault.sidebarOpen)}
					>
						<IconPanel />
					</button>
					<span className="brand-mark" aria-hidden="true">
						<IconVault />
					</span>
					<strong>Vault</strong>
					<span
						className={`status ${vault.saving ? 'status-busy' : ''} ${vault.error ? 'status-error' : ''}`}
						title={vault.status}
					>
						<i className="status-dot" />
						{vault.saving ? 'Saving…' : vault.status}
					</span>
				</div>
				{vault.activeNote && vault.appMode === 'notes' && (
					<div className="note-title">
						<span>{vault.activeNote.title}</span>
						{vault.activeNote.tags.length > 0 && (
							<div className="tags">
								{vault.activeNote.tags.map((tag) => (
									<span key={tag}>#{tag}</span>
								))}
							</div>
						)}
					</div>
				)}
				<div className="top-actions">
					{vault.appMode === 'notes' && (
						<div className="seg">
							{(['edit', 'split', 'preview'] as const).map((mode) => (
								<button
									key={mode}
									type="button"
									className={vault.viewMode === mode ? 'active' : ''}
									onClick={() => vault.setViewMode(mode)}
								>
									{mode}
								</button>
							))}
						</div>
					)}
					<button
						type="button"
						className="icon-btn"
						title="Command palette (⌘K)"
						onClick={() => vault.setPaletteOpen(true)}
					>
						<IconSearch />
					</button>
					<button
						type="button"
						className="icon-btn"
						title={vault.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
						onClick={vault.toggleTheme}
					>
						{vault.theme === 'dark' ? <IconSun /> : <IconMoon />}
					</button>
					<button
						type="button"
						className={`icon-btn flip ${vault.rightOpen ? 'active' : ''}`}
						title="Toggle outline"
						onClick={() => vault.setRightOpen(!vault.rightOpen)}
					>
						<IconPanel />
					</button>
				</div>
			</header>
			{vault.error && (
				<div className="banner" role="status">
					<IconAlert />
					<span>{vault.error}</span>
				</div>
			)}
			<div
				className={`workspace ${vault.sidebarOpen ? '' : 'no-left'} ${vault.rightOpen ? '' : 'no-right'}`}
			>
				<Sidebar />
				<EditorPane />
				<FileLibrary />
				<RightPane />
			</div>
			<CommandPalette />
			<FileViewer />
			<DialogHost />
		</div>
	);
}

export default function App() {
	return (
		<VaultProvider>
			<Shell />
		</VaultProvider>
	);
}
