import { openuiLibrary } from '@openuidev/react-ui/genui-lib';

import type { OpenUiReferenceInput } from './contracts.js';

const PROFILE_FOCUS: Record<OpenUiReferenceInput['profile'], string> = {
  basic:
    'Focus on Stack, Card, CardHeader, TextContent, Callout, TagBlock, Buttons, and Separator.',
  dashboard:
    'Focus on Table/Col, chart components, KPI Cards, Tabs, and shared data arrays.',
  form: 'Focus on Form, FormControl, input components, Buttons/Action, validation rules, bindings, and Modal.',
  all: 'Use any documented component, but prefer the smallest set that satisfies the request.',
};

export function getOpenUiReference(
  profile: OpenUiReferenceInput['profile'],
): string {
  return `Authoring profile: ${profile}. ${PROFILE_FOCUS[profile]}\nDo not emit XML, HTML, JSX, markdown fences, or explanations inside document.source.\n\n${openuiLibrary.prompt({})}`;
}

export function getOpenUiDslSchema(): string {
  return JSON.stringify(openuiLibrary.toJSONSchema(), null, 2);
}
