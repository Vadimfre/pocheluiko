import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Footer.css';
import { useLanguage } from '../LanguageContext';

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const IconTwitter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
  </svg>
);

const IconYoutube = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>{language === 'en' ? 'Ecology and the World' : 'Экология и мир'}</h3>
            <p>
              {language === 'en'
                ? 'Information resource about reserves and protected natural areas of the Republic of Belarus'
                : 'Информационный ресурс о заповедниках и охраняемых природных территориях Республики Беларусь'}
            </p>
          </div>
          <div className="footer-section">
            <h4>{language === 'en' ? 'Navigation' : 'Навигация'}</h4>
            <ul>
              <li>
                <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
                  {language === 'en' ? 'Home' : 'Главная'}
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
                  {language === 'en' ? 'About' : 'О нас'}
                </a>
              </li>
              <li>
                <a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>
                  {language === 'en' ? 'Programs' : 'Направления'}
                </a>
              </li>
              <li>
                <a href="#reserves" onClick={(e) => { e.preventDefault(); scrollToSection('reserves'); }}>
                  {language === 'en' ? 'Reserves' : 'Заповедники'}
                </a>
              </li>
              <li>
                <Link to="/ecology">
                  {language === 'en' ? 'Ecology' : 'Экология'}
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  {language === 'en' ? 'Contacts' : 'Контакты'}
                </Link>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>{language === 'en' ? 'Contacts' : 'Контакты'}</h4>
            <ul>
              <li><IconMail /> info@ecology-world.by</li>
              <li><IconPhone /> +375 (17) 123-45-67</li>
              <li>
                <IconPin /> {language === 'en'
                  ? 'Minsk, Ekologicheskaya st., 1'
                  : 'г. Минск, ул. Экологическая, 1'}
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>{language === 'en' ? 'Social networks' : 'Социальные сети'}</h4>
            <div className="social-links">
              <a href="https://www.facebook.com/share/1CBWhT2ZZN/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><IconFacebook /></a>
              <a href="https://www.instagram.com/arseniypoje?igsh=eDUzY3IyeDd6cXQ1&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>
              <a href="https://x.com/aarspotseluyko?s=21" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><IconTwitter /></a>
              <a href="https://youtube.com/@saenara2307?si=mXU7HC7yMpIHCU4I" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><IconYoutube /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            {language === 'en'
              ? '© 2024 Ecology and the World. All rights reserved.'
              : '© 2024 Экология и мир. Все права защищены.'}
          </p>
          <button className="scroll-to-top" onClick={scrollToTop} aria-label="Наверх">
            ↑
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
