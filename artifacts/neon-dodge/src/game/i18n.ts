
/* =========================================================
   i18n — Turkish / English translations
   ========================================================= */

export type Lang = 'tr' | 'en';
export const STORAGE_LANG = 'neonDodge_lang';

export function getLang(): Lang {
  return (localStorage.getItem(STORAGE_LANG) as Lang) ?? 'en';
}
export function setLang(l: Lang) {
  localStorage.setItem(STORAGE_LANG, l);
}

export const STRINGS = {
  en: {
    noRecord:    'NO RECORD YET',
    selectSkin:  'SELECT SKIN',
    skinNames:   ['CLASSIC', 'NASA', 'TURKISH', 'FOREST'],
    play:        '▶   PLAY',
    games:       'GAMES',
    totalTime:   'TOTAL TIME',
    bestCombo:   'BEST COMBO',
    paused:      'PAUSED',
    resume:      '▶  RESUME',
    soundOn:     '🔊  SOUND ON',
    soundOff:    '🔇  SOUND OFF',
    mainMenu:    '⟵  MAIN MENU',
    gameOver:    'GAME OVER',
    score:       'SCORE',
    newBest:     '★  NEW BEST  ★',
    best:        'BEST SCORE',
    level:       'LEVEL',
    survived:    'SURVIVED',
    maxCombo:    'MAX COMBO',
    allTime:     'ALL TIME',
    watchAd:     '▶  WATCH AD  +1 LIFE',
    playAgain:   '↩  PLAY AGAIN',
    menu:        'MENU',
    selectLang:  'SELECT LANGUAGE',
    lvl:         'LVL',
    closeIn:     'Close in',
    tapContinue: 'Tap to continue',
    adTitle:     'AD PLACEHOLDER',
    adBody:      'In a real release,\nan ad would play here.',
    changeLater: 'You can change this later in the menu',
    settings:    'SETTINGS',
    language:    'LANGUAGE',
    sound:       'SOUND',
    close:       '✕  CLOSE',
  },
  tr: {
    noRecord:    'KAYIT YOK',
    selectSkin:  'KOSTÜM SEÇ',
    skinNames:   ['KLASİK', 'NASA', 'TÜRK', 'ORMAN'],
    play:        '▶   OYNA',
    games:       'OYUN',
    totalTime:   'TOPLAM SÜRE',
    bestCombo:   'EN İYİ KOMBO',
    paused:      'DURAKLATILDI',
    resume:      '▶  DEVAM',
    soundOn:     '🔊  SES AÇIK',
    soundOff:    '🔇  SES KAPALI',
    mainMenu:    '⟵  ANA MENÜ',
    gameOver:    'OYUN BİTTİ',
    score:       'PUAN',
    newBest:     '★  YENİ REKOR  ★',
    best:        'EN İYİ SKOR',
    level:       'SEVİYE',
    survived:    'SÜRE',
    maxCombo:    'MAX KOMBO',
    allTime:     'TÜM ZAMANLAR',
    watchAd:     '▶  REKLAM İZLE  +1 CAN',
    playAgain:   '↩  TEKRAR OYNA',
    menu:        'MENÜ',
    selectLang:  'DİL SEÇİN',
    lvl:         'SEV',
    closeIn:     'Kapatılıyor',
    tapContinue: 'Devam için dokun',
    adTitle:     'REKLAM YER TUTUCUSU',
    adBody:      'Gerçek bir sürümde\nburada reklam oynatılır.',
    changeLater: 'Bunu menüden sonra değiştirebilirsin',
    settings:    'AYARLAR',
    language:    'DİL',
    sound:       'SES',
    close:       '✕  KAPAT',
  },
} as const;

export type Strings = typeof STRINGS.en;

export function t(): Strings {
  return STRINGS[getLang()] as Strings;
}
