import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import { useLanguage } from '../LanguageContext';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [reservesDropdownOpen, setReservesDropdownOpen] = useState(false);
  const [ecologyDropdownOpen, setEcologyDropdownOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const reserves = [
    { id: 1, nameRu: 'Беловежская пуща', nameEn: 'Belovezhskaya Pushcha', slug: 'belovezhskaya-pushcha' },
    { id: 2, nameRu: 'Березинский заповедник', nameEn: 'Berezinsky Reserve', slug: 'berezinsky' },
    { id: 3, nameRu: 'Припятский парк', nameEn: 'Pripyatsky Park', slug: 'pripyatsky' },
    { id: 4, nameRu: 'Нарочанский парк', nameEn: 'Narochansky Park', slug: 'narochansky' },
    { id: 5, nameRu: 'Браславские озера', nameEn: 'Braslav Lakes', slug: 'braslavskie' },
    { id: 6, nameRu: 'Полесский заповедник', nameEn: 'Polesky Reserve', slug: 'polesky' }
  ];

  const ecologyTopics = [
    { id: 'importance', nameRu: 'Важность экологии', nameEn: 'Importance of Ecology' },
    { id: 'climate', nameRu: 'Изменение климата', nameEn: 'Climate Change' },
    { id: 'biodiversity', nameRu: 'Биоразнообразие', nameEn: 'Biodiversity' },
    { id: 'pollution', nameRu: 'Загрязнение', nameEn: 'Pollution' },
    { id: 'resources', nameRu: 'Природные ресурсы', nameEn: 'Natural Resources' },
    { id: 'protection', nameRu: 'Охрана природы', nameEn: 'Nature Protection' },
    { id: 'sustainable', nameRu: 'Устойчивое развитие', nameEn: 'Sustainable Development' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    setIsMobileMenuOpen(false);
  };

  const handleReservesClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      scrollToSection('reserves');
    } else {
      e.preventDefault();
      navigate('/');
      setTimeout(() => {
        scrollToSection('reserves');
      }, 100);
    }
    setReservesDropdownOpen(false);
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-text">{t('header', 'title')}</span>
          </Link>
          <nav className={`nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
              {t('header', 'navHome')}
            </a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
              {t('header', 'navAbout')}
            </a>
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>
              {t('header', 'navServices')}
            </a>
            
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setReservesDropdownOpen(true)}
              onMouseLeave={() => setReservesDropdownOpen(false)}
            >
              <a
                href="#reserves"
                onClick={handleReservesClick}
                className="dropdown-trigger"
              >
                {t('header', 'navReserves')}
                <span className="dropdown-arrow">▼</span>
              </a>
              {reservesDropdownOpen && (
                <div className="dropdown-menu">
                  {reserves.map((reserve) => (
                    <Link
                      key={reserve.id}
                      to={`/reserve/${reserve.id}`}
                      className="dropdown-item"
                      onClick={() => {
                        setReservesDropdownOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {language === 'en' ? reserve.nameEn : reserve.nameRu}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div 
              className="nav-dropdown"
              onMouseEnter={() => setEcologyDropdownOpen(true)}
              onMouseLeave={() => setEcologyDropdownOpen(false)}
            >
              <Link 
                to="/ecology"
                className="dropdown-trigger"
                onClick={() => {
                  setEcologyDropdownOpen(false);
                  setIsMobileMenuOpen(false);
                }}
              >
                {t('header', 'navEcology')}
                <span className="dropdown-arrow">▼</span>
              </Link>
              {ecologyDropdownOpen && (
                <div className="dropdown-menu">
                  {ecologyTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      to={`/ecology#${topic.id}`}
                      className="dropdown-item"
                      onClick={() => {
                        setEcologyDropdownOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {language === 'en' ? topic.nameEn : topic.nameRu}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link 
              to="/contact" 
              onClick={() => {
                setIsMobileMenuOpen(false);
              }}
            >
              {t('header', 'navContacts')}
            </Link>
            <Link 
              to="/account"
              onClick={() => {
                setIsMobileMenuOpen(false);
              }}
            >
              {language === 'en' ? 'Account' : 'Аккаунт'}
            </Link>
            <div className="language-switcher">
              <span className="language-label">{t('header', 'languageLabel')}:</span>
              <button
                type="button"
                className={language === 'ru' ? 'lang-btn active' : 'lang-btn'}
                onClick={() => setLanguage('ru')}
              >
                RU
              </button>
              <button
                type="button"
                className={language === 'en' ? 'lang-btn active' : 'lang-btn'}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
            </div>
            <ThemeToggle />
          </nav>
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

