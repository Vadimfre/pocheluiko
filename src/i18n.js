export const languages = {
  ru: 'ru',
  en: 'en',
};

const translations = {
  header: {
    title: {
      ru: 'Экология и мир',
      en: 'Ecology and the World',
    },
    navHome: {
      ru: 'Главная',
      en: 'Home',
    },
    navAbout: {
      ru: 'О нас',
      en: 'About',
    },
    navServices: {
      ru: 'Направления',
      en: 'Programs',
    },
    navReserves: {
      ru: 'Заповедники',
      en: 'Reserves',
    },
    navEcology: {
      ru: 'Экология',
      en: 'Ecology',
    },
    navContacts: {
      ru: 'Контакты',
      en: 'Contacts',
    },
    languageLabel: {
      ru: 'Язык',
      en: 'Language',
    },
  },
};

export function translate(section, key, lang) {
  const sectionObj = translations[section];
  if (!sectionObj) return key;
  const entry = sectionObj[key];
  if (!entry) return key;
  return entry[lang] || entry.ru || key;
}

