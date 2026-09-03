import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: string) {
	return function Icon(props: IconProps) {
		return (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				{...props}
			>
				<g dangerouslySetInnerHTML={{ __html: paths }} />
			</svg>
		);
	};
}

export const IconSearch = icon(
	'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
);
export const IconNote = icon(
	'<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v5h5"/><path d="M8 13h8M8 17h5"/>',
);
export const IconFolder = icon(
	'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
);
export const IconPlus = icon('<path d="M12 5v14M5 12h14"/>');
export const IconSun = icon(
	'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M6.2 17.8 4.8 19.2M19.2 4.8l-1.4 1.4"/>',
);
export const IconMoon = icon('<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/>');
export const IconPanel = icon(
	'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
);
export const IconUpload = icon(
	'<path d="M12 16V7m0 0 4 4m-4-4-4 4"/><path d="M5 19h14"/>',
);
export const IconTrash = icon(
	'<path d="M4 7h16M9 7V5h6v2m-8 0 1 12h8l1-12"/>',
);
export const IconLibrary = icon(
	'<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>',
);
export const IconClose = icon('<path d="M6 6l12 12M18 6 6 18"/>');
export const IconCheck = icon('<path d="m5 12 5 5L20 7"/>');
export const IconFile = icon(
	'<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
);
