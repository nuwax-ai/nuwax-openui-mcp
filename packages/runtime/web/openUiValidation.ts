import { builtInValidators } from '@openuidev/react-lang';

type Validator = (value: unknown, arg?: number | string) => string | undefined;

const CONFIGURED_MARKER = Symbol.for('nuwax.openui.validation.configured');

const messages = {
  en: {
    required: 'This field is required',
    optionRequired: 'Please select at least one option',
  },
  zh: {
    required: '请填写此字段',
    optionRequired: '请至少选择一项',
  },
  // 繁体中文（zh-TW / zh-HK / zh-MO / zh-Hant）
  zhHant: {
    required: '請填寫此欄位',
    optionRequired: '請至少選擇一項',
  },
  ja: {
    required: 'この項目は必須です',
    optionRequired: '1つ以上選択してください',
  },
} as const;

function localeMessages() {
  const locale = (
    navigator.language ||
    document.documentElement.lang ||
    'en'
  ).toLowerCase();
  // 繁体：台湾 / 香港 / 澳门 / 显式 Hant；其余 zh*（含 zh-CN、zh-Hans）走简体
  if (
    locale.startsWith('zh-tw') ||
    locale.startsWith('zh-hk') ||
    locale.startsWith('zh-mo') ||
    locale.includes('hant')
  ) {
    return messages.zhHant;
  }
  if (locale.startsWith('zh')) return messages.zh;
  if (locale.startsWith('ja')) return messages.ja;
  return messages.en;
}

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isValidDate(value)) return false;
  if (value instanceof Date) return true;
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  if ('value' in record) return isEmptyValue(record.value);
  if ('from' in record || 'to' in record) {
    return !isValidDate(record.from) || !isValidDate(record.to);
  }
  return Object.keys(record).length === 0;
};

const requiredValidator: Validator = (value) => {
  const localized = localeMessages();
  if (isEmptyValue(value)) return localized.required;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const values = Object.values(value);
    if (
      values.length > 0 &&
      values.every((item) => typeof item === 'boolean') &&
      !values.some(Boolean)
    ) {
      return localized.optionRequired;
    }
  }
  return undefined;
};

export function configureOpenUiValidation(): void {
  const validators = builtInValidators as typeof builtInValidators & {
    [CONFIGURED_MARKER]?: boolean;
  };
  if (validators[CONFIGURED_MARKER]) return;
  builtInValidators.required = requiredValidator;
  Object.defineProperty(validators, CONFIGURED_MARKER, { value: true });
}
