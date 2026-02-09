import de from './de'

type TranslationKey = keyof typeof de

export function t(key: TranslationKey, params?: Record<string, string>): string {
  let value: string = de[key]
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{{${k}}}`, v)
    }
  }
  return value
}
