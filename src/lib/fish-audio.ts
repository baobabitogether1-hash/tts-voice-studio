export const FISH_MODEL = 'fish-audio/s2.1-pro-free:free';
export const speechLanguages = [
  ['af', 'Afrikaans'], ['sq', 'Albanian'], ['am', 'Amharic'], ['ar', 'Arabic'],
  ['hy', 'Armenian'], ['as', 'Assamese'], ['ay', 'Aymara'], ['az', 'Azerbaijani'],
  ['eu', 'Basque'], ['be', 'Belarusian'], ['bn', 'Bengali'], ['bho', 'Bhojpuri'],
  ['bs', 'Bosnian'], ['bg', 'Bulgarian'], ['my', 'Burmese'], ['ca', 'Catalan'],
  ['ceb', 'Cebuano'], ['zh', 'Chinese'], ['zh-Hans', 'Chinese (Simplified)'], ['zh-Hant', 'Chinese (Traditional)'],
  ['co', 'Corsican'], ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'],
  ['dv', 'Dhivehi'], ['doi', 'Dogri'], ['nl', 'Dutch'], ['en', 'English'],
  ['eo', 'Esperanto'], ['et', 'Estonian'], ['ee', 'Ewe'], ['fil', 'Filipino'], ['tl', 'Tagalog'],
  ['fi', 'Finnish'], ['fr', 'French'], ['fy', 'Frisian'], ['gl', 'Galician'],
  ['ka', 'Georgian'], ['de', 'German'], ['el', 'Greek'], ['gn', 'Guarani'],
  ['gu', 'Gujarati'], ['ht', 'Haitian Creole'], ['ha', 'Hausa'], ['haw', 'Hawaiian'],
  ['he', 'Hebrew'], ['iw', 'Hebrew (legacy code)'], ['hi', 'Hindi'], ['hmn', 'Hmong'],
  ['hu', 'Hungarian'], ['is', 'Icelandic'], ['ig', 'Igbo'], ['id', 'Indonesian'],
  ['ga', 'Irish'], ['it', 'Italian'], ['ja', 'Japanese'], ['jv', 'Javanese'],
  ['jw', 'Javanese (legacy code)'], ['kn', 'Kannada'], ['kk', 'Kazakh'], ['km', 'Khmer'],
  ['rw', 'Kinyarwanda'], ['ko', 'Korean'], ['kri', 'Krio'], ['ku', 'Kurdish'],
  ['ky', 'Kyrgyz'], ['lo', 'Lao'], ['la', 'Latin'], ['lv', 'Latvian'],
  ['ln', 'Lingala'], ['lt', 'Lithuanian'], ['lb', 'Luxembourgish'], ['mk', 'Macedonian'],
  ['mg', 'Malagasy'], ['ms', 'Malay'], ['ml', 'Malayalam'], ['mt', 'Maltese'],
  ['mi', 'Maori'], ['mr', 'Marathi'], ['mn', 'Mongolian'], ['ne', 'Nepali'],
  ['nso', 'Northern Sotho'], ['no', 'Norwegian'], ['ny', 'Nyanja'], ['or', 'Odia'],
  ['om', 'Oromo'], ['ps', 'Pashto'], ['fa', 'Persian'], ['pl', 'Polish'],
  ['pt', 'Portuguese'], ['pt-BR', 'Portuguese (Brazil)'], ['pt-PT', 'Portuguese (Portugal)'],
  ['pa', 'Punjabi'], ['qu', 'Quechua'], ['ro', 'Romanian'], ['ru', 'Russian'],
  ['sm', 'Samoan'], ['sa', 'Sanskrit'], ['gd', 'Scottish Gaelic'], ['sr', 'Serbian'],
  ['sn', 'Shona'], ['sd', 'Sindhi'], ['si', 'Sinhala'], ['sk', 'Slovak'],
  ['sl', 'Slovenian'], ['so', 'Somali'], ['st', 'Southern Sotho'], ['es', 'Spanish'],
  ['es-419', 'Spanish (Latin America)'], ['es-MX', 'Spanish (Mexico)'], ['su', 'Sundanese'],
  ['sw', 'Swahili'], ['sv', 'Swedish'], ['tg', 'Tajik'], ['ta', 'Tamil'],
  ['tt', 'Tatar'], ['te', 'Telugu'], ['th', 'Thai'], ['ti', 'Tigrinya'],
  ['ts', 'Tsonga'], ['tr', 'Turkish'], ['tk', 'Turkmen'], ['uk', 'Ukrainian'],
  ['ur', 'Urdu'], ['ug', 'Uyghur'], ['uz', 'Uzbek'], ['vi', 'Vietnamese'],
  ['cy', 'Welsh'], ['xh', 'Xhosa'], ['yi', 'Yiddish'], ['yo', 'Yoruba'],
  ['zu', 'Zulu'], ['en-GB', 'English (United Kingdom)'], ['en-US', 'English (United States)'],
  ['fr-CA', 'French (Canada)'],
] as const;

import { defaultFishVoice, femaleFishVoices } from './fish-voices';

/** English default (female). Other languages get their own female voice from fish-voices. */
export const defaultVoice = femaleFishVoices['en']!.id;

/** Removes any speed setting: audio is always generated at normal speed and sped up during playback. */
export function withoutSpeed(options?: Record<string, unknown>) {
  if (!options) return undefined;
  const { speed: _speed, ...rest } = options;
  return rest;
}

export function speechBody(text: string, lang: string, voice?: string, options?: Record<string, unknown>) {
  const opts = withoutSpeed(options);
  const model = typeof opts?.['model'] === 'string' ? opts['model'] : FISH_MODEL;
  const isFish = model.startsWith('fish-audio/');
  // Fish clones the reference voice's accent, so the default is a female voice in the same language.
  const chosen = voice || (isFish ? defaultFishVoice(lang) : defaultVoice);
  return { ...opts, input: text, model, response_format: 'mp3',
    ...(chosen ? { voice: chosen } : {}),
    ...(isFish ? { language: lang } : {}),
  };
}
