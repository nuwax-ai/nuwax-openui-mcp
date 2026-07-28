import type { Theme } from '@openuidev/react-ui';

// Font stacks kept identical to the built-in default theme. Inter is not shipped
// as a webfont, so it resolves to the same system fallback as before; only the
// numeric sizes change here.
const FONT_BODY = '"Inter", sans-serif';
const FONT_HEADING = '"Inter", sans-serif';
const FONT_LABEL = '"Inter", sans-serif';
const FONT_NUMBERS = '"Inter", sans-serif';
const FONT_CODE = '"SFMono-Regular", Menlo, monospace';

/**
 * Compact density overrides for the OpenUI design tokens, tuned to match the
 * Nuwax host baseline (antd, 14px body text).
 *
 * Passed to `<ThemeProvider lightTheme={compactOpenUiTheme}>` so that the frozen
 * runtime (sidecar / file preview) and the in-page inline renderer share one
 * source of truth. `ThemeProvider` deep-merges these partial overrides onto the
 * built-in defaults, and — because `darkTheme` is omitted — applies them to both
 * light and dark modes. Radix portals inherit the same variables via the portal
 * theme class, so popovers shrink consistently.
 *
 * Note: components consume the *composite* `text*` font shorthands (e.g.
 * `font: var(--openui-text-body-default)`), not `fontSize*`, so each text token
 * that should shrink is overridden explicitly below.
 */
export const compactOpenUiTheme: Theme = {
  // --- Spacing (one step tighter; body grid 12px → 10px) ---
  space2xs: '3px',
  spaceXs: '4px',
  spaceS: '6px',
  spaceSM: '8px',
  spaceM: '10px',
  spaceML: '12px',
  spaceL: '12px',
  spaceXl: '16px',
  space2xl: '24px',
  space3xl: '32px',

  // --- Radius (one step smaller) ---
  radiusXs: '3px',
  radiusS: '4px',
  radiusM: '6px',
  radiusL: '8px',
  radiusXl: '10px',
  radius2xl: '10px',
  radius3xl: '12px',
  radius4xl: '14px',
  radius5xl: '16px',
  radius6xl: '20px',
  radius7xl: '24px',
  radius8xl: '28px',
  radius9xl: '32px',

  // --- Standalone font sizes (kept consistent with the composites below) ---
  fontSizeSm: '13px',
  fontSizeMd: '14px',
  fontSizeLg: '16px',
  fontSizeXl: '18px',
  fontSize2xl: '20px',
  fontSize3xl: '24px',
  fontSize4xl: '28px',
  fontSize5xl: '32px',

  // --- Body (16px → 14px baseline) ---
  textBodySm: `400 13px/1.5 ${FONT_BODY}`,
  textBodySmHeavy: `500 13px/1.5 ${FONT_BODY}`,
  textBodyDefault: `400 14px/1.5 ${FONT_BODY}`,
  textBodyDefaultHeavy: `500 14px/1.5 ${FONT_BODY}`,
  textBodyLg: `400 16px/1.5 ${FONT_BODY}`,
  textBodyLgHeavy: `500 16px/1.5 ${FONT_BODY}`,

  // --- Heading (md 24px → 20px) ---
  textHeadingXs: `600 14px/1.25 ${FONT_HEADING}`,
  textHeadingSm: `600 16px/1.25 ${FONT_HEADING}`,
  textHeadingMd: `600 20px/1.1 ${FONT_HEADING}`,
  textHeadingLg: `600 24px/1.1 ${FONT_HEADING}`,
  textHeadingXl: `700 28px/1.1 ${FONT_HEADING}`,

  // --- Label (16px → 14px baseline) ---
  textLabelSm: `400 13px/1.25 ${FONT_LABEL}`,
  textLabelSmHeavy: `500 13px/1.25 ${FONT_LABEL}`,
  textLabelDefault: `400 14px/1.25 ${FONT_LABEL}`,
  textLabelDefaultHeavy: `500 14px/1.25 ${FONT_LABEL}`,
  textLabelLg: `400 16px/1.25 ${FONT_LABEL}`,
  textLabelLgHeavy: `500 16px/1.25 ${FONT_LABEL}`,

  // --- Numbers (mirror body + heading scale) ---
  textNumbersSm: `400 13px/1.5 ${FONT_NUMBERS}`,
  textNumbersSmHeavy: `500 13px/1.5 ${FONT_NUMBERS}`,
  textNumbersDefault: `400 14px/1.5 ${FONT_NUMBERS}`,
  textNumbersDefaultHeavy: `500 14px/1.5 ${FONT_NUMBERS}`,
  textNumbersLg: `400 16px/1.5 ${FONT_NUMBERS}`,
  textNumbersLgHeavy: `500 16px/1.5 ${FONT_NUMBERS}`,
  textNumbersHeadingSm: `600 16px/1.25 ${FONT_NUMBERS}`,
  textNumbersHeadingMd: `600 20px/1.1 ${FONT_NUMBERS}`,
  textNumbersHeadingLg: `600 24px/1.1 ${FONT_NUMBERS}`,
  textNumbersHeadingXl: `600 28px/1.1 ${FONT_NUMBERS}`,

  // --- Code (default 14px → 13px) ---
  textCodeDefault: `400 13px/1.5 ${FONT_CODE}`,
  textCodeDefaultHeavy: `700 13px/1.5 ${FONT_CODE}`,
};
