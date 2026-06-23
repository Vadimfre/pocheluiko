import React, { createContext, useContext, useState, useMemo } from 'react';
import { translate, languages } from './i18n';

const LanguageContext = createContext({
  language: languages.ru,
  setLanguage: () => {},
  t: (section, key) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(languages.ru);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (section, key) => translate(section, key, language),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

