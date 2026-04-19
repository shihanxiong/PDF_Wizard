/**
 * Application-wide constants
 */

export const MAX_SPLITS = 10;
export const MAX_ROTATIONS = 10;
export const PDF_EXTENSION = '.pdf';

/** Main app feature tabs — order is toolbar left-to-right. */
export const MAIN_TAB_IDS = ['merge', 'split', 'rotate', 'watermark', 'imagesToPdf'] as const;
export type MainTabId = (typeof MAIN_TAB_IDS)[number];

