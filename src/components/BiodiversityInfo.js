import React from 'react';
import './BiodiversityInfo.css';
import { useLanguage } from '../LanguageContext';

const BiodiversityInfo = () => {
  const { language } = useLanguage();
  const t = (ru, en) => (language === 'en' ? en : ru);

  const stats = [
    { icon: '🌍', value: '8.7M', label: t('видов на Земле', 'species on Earth') },
    { icon: '🦋', value: '1M', label: t('видов под угрозой', 'species threatened') },
    { icon: '🌳', value: '80%', label: t('наземного биоразнообразия в лесах', 'terrestrial biodiversity in forests') },
    { icon: '🐠', value: '2.2M', label: t('морских видов', 'marine species') }
  ];

  return (
    <div className="biodiversity-info">
      <h3>{t('Биоразнообразие в цифрах', 'Biodiversity in Numbers')}</h3>
      <div className="biodiversity-grid">
        {stats.map((stat, index) => (
          <div key={index} className="biodiversity-card">
            <div className="bio-icon">{stat.icon}</div>
            <div className="bio-value">{stat.value}</div>
            <div className="bio-label">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="biodiversity-chart">
        <h4>{t('Распределение видов', 'Species Distribution')}</h4>
        <div className="chart-bars">
          <div className="chart-bar">
            <div className="bar-fill" style={{ width: '75%', background: '#4caf50' }}></div>
            <span className="bar-label">{t('Насекомые 75%', 'Insects 75%')}</span>
          </div>
          <div className="chart-bar">
            <div className="bar-fill" style={{ width: '17%', background: '#8bc34a' }}></div>
            <span className="bar-label">{t('Растения 17%', 'Plants 17%')}</span>
          </div>
          <div className="chart-bar">
            <div className="bar-fill" style={{ width: '5%', background: '#cddc39' }}></div>
            <span className="bar-label">{t('Грибы 5%', 'Fungi 5%')}</span>
          </div>
          <div className="chart-bar">
            <div className="bar-fill" style={{ width: '3%', background: '#ffeb3b' }}></div>
            <span className="bar-label">{t('Другие 3%', 'Others 3%')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiodiversityInfo;
