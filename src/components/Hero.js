import React from 'react';
import './Hero.css';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';

const Hero = () => {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-background">
        <img
          src="/images/hero/hero-background.jpg"
          alt=""
          className="hero-image"
          style={{
            filter: theme === 'dark' ? 'brightness(0.35) saturate(0.6)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
        <div className={`hero-overlay ${theme === 'dark' ? 'dark' : ''}`}></div>
      </div>
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            {language === 'en' ? 'Ecology and the World' : 'Экология и мир'}
          </h1>
          <p className="hero-subtitle">
            {language === 'en'
              ? 'Explore unique reserves and protected areas of the Republic of Belarus'
              : 'Изучайте уникальные заповедники и охраняемые территории Республики Беларусь'}
          </p>
          <p className="hero-description">
            {language === 'en'
              ? 'Discover the natural heritage of Belarus through interactive maps and detailed information about reserves'
              : 'Откройте для себя природное наследие Беларуси через интерактивные карты и подробную информацию о заповедниках'}
          </p>
          <div className="hero-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => scrollToSection('reserves')}
            >
              {language === 'en' ? 'Explore reserves' : 'Изучить заповедники'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => scrollToSection('about')}
            >
              {language === 'en' ? 'Learn more' : 'Узнать больше'}
            </button>
          </div>
        </div>
      </div>
      <div className="hero-scroll-indicator">
        <span>↓</span>
      </div>
    </section>
  );
};

export default Hero;

