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
export const IconChevron = icon('<path d="m15 5-7 7 7 7"/>');
export const IconInfo = icon(
	'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
);
export const IconExpand = icon(
	'<path d="M9 4H4v5"/><path d="M4 4l6 6"/><path d="M15 20h5v-5"/><path d="m20 20-6-6"/>',
);
export const IconCheck = icon('<path d="m5 12 5 5L20 7"/>');
export const IconFile = icon(
	'<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
);
export const IconPencil = icon(
	'<path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/><path d="m13.5 7 3.5 3.5"/>',
);
export const IconDownload = icon(
	'<path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/>',
);
export const IconUnfile = icon('<path d="M12 20V6m0 0 4 4m-4-4-4 4"/><path d="M5 4h14"/>');
export const IconGrid = icon(
	'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
);
export const IconList = icon(
	'<path d="M4 6h16M4 12h16M4 18h16"/>',
);
export const IconImage = icon(
	'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4.5 4 3-2.5L20 18"/>',
);
export const IconVideo = icon(
	'<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 12 6-3.5v7z"/>',
);
export const IconAudio = icon(
	'<path d="M9 18V7l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
);
export const IconPdf = icon(
	'<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 17h1.5a1.25 1.25 0 0 0 0-2.5H9zm0 0v-2.5"/>',
);
export const IconVault = icon(
	'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16"/>',
);
export const IconAlert = icon(
	'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>',
);
export const IconSparkle = icon(
	'<path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13l-5.6-2 5.6-2z"/>',
);

const KIND_ICONS = {
	image: IconImage,
	video: IconVideo,
	audio: IconAudio,
	pdf: IconPdf,
	note: IconNote,
	other: IconFile,
} as const;

export function kindIcon(kind: keyof typeof KIND_ICONS) {
	return KIND_ICONS[kind] ?? IconFile;
}
