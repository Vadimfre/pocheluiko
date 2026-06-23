import React from 'react';
import './EcoTimeline.css';
import { useLanguage } from '../LanguageContext';

const EcoTimeline = () => {
  const { language } = useLanguage();

  const events = language === 'en' ? [
    { year: 1962, title: 'Silent Spring', description: 'Rachel Carson publishes book about pesticide dangers' },
    { year: 1970, title: 'First Earth Day', description: '20 million Americans participate in environmental protests' },
    { year: 1987, title: 'Montreal Protocol', description: 'International treaty to protect ozone layer' },
    { year: 1992, title: 'Rio Earth Summit', description: 'UN Conference on Environment and Development' },
    { year: 1997, title: 'Kyoto Protocol', description: 'First international climate agreement' },
    { year: 2015, title: 'Paris Agreement', description: 'Global commitment to limit warming to 1.5°C' },
    { year: 2019, title: 'Climate Strikes', description: 'Millions of youth demand climate action worldwide' }
  ] : [
    { year: 1962, title: 'Тихая весна', description: 'Рэйчел Карсон публикует книгу об опасности пестицидов' },
    { year: 1970, title: 'Первый День Земли', description: '20 млн американцев участвуют в экологических акциях' },
    { year: 1987, title: 'Монреальский протокол', description: 'Международный договор по защите озонового слоя' },
    { year: 1992, title: 'Саммит Земли в Рио', description: 'Конференция ООН по окружающей среде и развитию' },
    { year: 1997, title: 'Киотский протокол', description: 'Первое международное соглашение по климату' },
    { year: 2015, title: 'Парижское соглашение', description: 'Глобальное обязательство ограничить потепление до 1.5°C' },
    { year: 2019, title: 'Климатические забастовки', description: 'Миллионы молодых людей требуют действий по климату' }
  ];

  return (
    <div className="eco-timeline">
      <h3>{language === 'en' ? 'Environmental Milestones' : 'Важные экологические события'}</h3>
      <div className="timeline-container">
        {events.map((event, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-marker">{event.year}</div>
            <div className="timeline-content">
              <h4>{event.title}</h4>
              <p>{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EcoTimeline;
