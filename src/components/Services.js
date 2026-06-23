import React from 'react';
import { Link } from 'react-router-dom';
import './Services.css';
import { useLanguage } from '../LanguageContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Icon from './Icon';

const Services = () => {
  const { language } = useLanguage();
  const [titleRef, titleVisible] = useScrollAnimation();
  const [gridRef, gridVisible] = useScrollAnimation();

  const services = [
    {
      iconKey: 'maps',
      titleRu: 'Интерактивные карты',
      titleEn: 'Interactive maps',
      descriptionRu: 'Изучайте расположение заповедников на интерактивных картах с подробной информацией о каждом объекте',
      descriptionEn: 'Explore the location of reserves on interactive maps with detailed information about each site',
      to: '/activity/maps',
      linkLabelRu: 'Страница «Интерактивные карты»',
      linkLabelEn: 'Interactive maps page',
    },
    {
      iconKey: 'education',
      titleRu: 'Образовательные материалы',
      titleEn: 'Educational materials',
      descriptionRu: 'Получайте актуальную информацию о флоре, фауне и экосистемах заповедников Беларуси',
      descriptionEn: 'Get up-to-date information about the flora, fauna and ecosystems of Belarusian reserves',
      to: '/activity/education',
      linkLabelRu: 'Страница «Образовательные материалы»',
      linkLabelEn: 'Educational materials page',
    },
    {
      iconKey: 'environmental',
      titleRu: 'Экологическое просвещение',
      titleEn: 'Environmental education',
      descriptionRu: 'Узнавайте о важности сохранения природы и экологических инициативах',
      descriptionEn: 'Learn about the importance of nature conservation and environmental initiatives',
      to: '/activity/environmental',
      linkLabelRu: 'Страница «Экопросвещение»',
      linkLabelEn: 'Environmental education page',
    },
    {
      iconKey: 'research',
      titleRu: 'Научные исследования',
      titleEn: 'Scientific research',
      descriptionRu: 'Изучайте результаты научных исследований и мониторинга состояния заповедников',
      descriptionEn: 'Study the results of scientific research and monitoring of reserve conditions',
      to: '/activity/research',
      linkLabelRu: 'Страница «Научные исследования»',
      linkLabelEn: 'Scientific research page',
    },
  ];

  return (
    <section
      id="services"
      className="services"
      style={{
        backgroundImage: "url(/images/backgrounds/services-section-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="container">
        <h2 
          ref={titleRef}
          className={`section-title animate-on-scroll ${titleVisible ? 'animated' : ''}`}
        >
          {language === 'en' ? 'Areas of activity' : 'Направления деятельности'}
        </h2>
        <div 
          ref={gridRef}
          className={`services-grid ${gridVisible ? 'services-grid-animated' : ''}`}
        >
          {services.map((service, index) => (
            <Link
              key={index}
              to={service.to}
              className={`service-card service-card-link animate-on-scroll animate-delay-${index + 1} ${gridVisible ? 'animated' : ''}`}
            >
              <div className="service-icon-wrap">
                <Icon name={service.iconKey} size={32} />
              </div>
              <h3 className="service-title">
                {language === 'en' ? service.titleEn : service.titleRu}
              </h3>
              <p className="service-description">
                {language === 'en' ? service.descriptionEn : service.descriptionRu}
              </p>
              <span className="service-cta">
                {language === 'en' ? service.linkLabelEn : service.linkLabelRu} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

