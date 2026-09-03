import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IconAlert, IconCheck, IconClose, IconFolder, IconPencil } from './Icons';

export type Choice = { label: string; value: string | null; hint?: string };

type Base = { id: number; title: string; message?: string; confirmLabel?: string };

type Request =
	| (Base & { kind: 'prompt'; defaultValue: string; resolve: (value: string | null) => void })
	| (Base & { kind: 'confirm'; danger: boolean; resolve: (value: boolean) => void })
	| (Base & {
			kind: 'choose';
			choices: Choice[];
			resolve: (value: string | null | undefined) => void;
	  });

let queue: Request[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function enqueue(request: Request) {
	queue = [...queue, request];
	emit();
}

function settle<T>(request: Request, value: T) {
	queue = queue.filter((item) => item !== request);
	(request.resolve as (value: T) => void)(value);
	emit();
}

type Options = Omit<Base, 'id' | 'title'>;

export const dialog = {
	prompt(title: string, defaultValue = '', options: Options = {}) {
		return new Promise<string | null>((resolve) => {
			enqueue({
				kind: 'prompt',
				id: nextId++,
				title,
				defaultValue,
				confirmLabel: 'Save',
				...options,
				resolve,
			});
		});
	},
	confirm(title: string, options: Options & { danger?: boolean } = {}) {
		return new Promise<boolean>((resolve) => {
			enqueue({
				kind: 'confirm',
				id: nextId++,
				title,
				danger: false,
				confirmLabel: 'Confirm',
				...options,
				resolve,
			});
		});
	},
	/** Resolves to the picked value, or `undefined` when dismissed. */
	choose(title: string, choices: Choice[], options: Options = {}) {
		return new Promise<string | null | undefined>((resolve) => {
			enqueue({ kind: 'choose', id: nextId++, title, choices, ...options, resolve });
		});
	},
};

export function DialogHost() {
	const request = useSyncExternalStore(
		subscribe,
		() => queue[0] ?? null,
		() => null,
	);
	if (!request) return null;
	return <DialogPanel key={request.id} request={request} />;
}

function DialogPanel({ request }: { request: Request }) {
	const [value, setValue] = useState(request.kind === 'prompt' ? request.defaultValue : '');
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		input.focus();
		const dot = input.value.lastIndexOf('.');
		input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
	}, []);

	const cancel = () => {
		if (request.kind === 'confirm') settle(request, false);
		else if (request.kind === 'choose') settle(request, undefined);
		else settle(request, null);
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			event.stopPropagation();
			cancel();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [request]);

	const submit = () => {
		if (request.kind === 'prompt') {
			const trimmed = value.trim();
			if (!trimmed) return;
			settle(request, trimmed);
			return;
		}
		if (request.kind === 'confirm') settle(request, true);
	};

	const danger = request.kind === 'confirm' && request.danger;
	const Glyph = danger
		? IconAlert
		: request.kind === 'prompt'
			? IconPencil
			: request.kind === 'choose'
				? IconFolder
				: IconCheck;

	return (
		<div className="dialog-backdrop" onMouseDown={cancel}>
			<div
				className={`dialog ${danger ? 'dialog-danger' : ''}`}
				role="dialog"
				aria-modal="true"
				aria-label={request.title}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<header className="dialog-head">
					<span className="dialog-glyph">
						<Glyph />
					</span>
					<div className="dialog-copy">
						<strong>{request.title}</strong>
						{request.message && <p>{request.message}</p>}
					</div>
					<button type="button" className="icon-btn" title="Close" onClick={cancel}>
						<IconClose />
					</button>
				</header>

				{request.kind === 'prompt' && (
					<form
						className="dialog-body"
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
					>
						<input
							ref={inputRef}
							className="dialog-input"
							value={value}
							onChange={(event) => setValue(event.target.value)}
							spellCheck={false}
						/>
					</form>
				)}

				{request.kind === 'choose' && (
					<ul className="dialog-choices">
						{request.choices.map((choice) => (
							<li key={choice.value ?? '__root__'}>
								<button type="button" onClick={() => settle(request, choice.value)}>
									<IconFolder />
									<span>{choice.label}</span>
									{choice.hint && <small>{choice.hint}</small>}
								</button>
							</li>
						))}
					</ul>
				)}

				<footer className="dialog-actions">
					<button type="button" className="btn btn-ghost" onClick={cancel}>
						Cancel
					</button>
					{request.kind !== 'choose' && (
						<button
							type="button"
							className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
							onClick={submit}
							disabled={request.kind === 'prompt' && !value.trim()}
						>
							{request.confirmLabel}
						</button>
					)}
				</footer>
			</div>
		</div>
	);
}
