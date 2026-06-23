import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ReservesMap.css';
import Icon from './Icon';
import { useLanguage } from '../LanguageContext';
import API from '../config';

const ReservesMap = () => {
  const [reserves, setReserves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef(null);
  const isScrollingRef = useRef(false);
  const { language } = useLanguage();

  useEffect(() => {
    fetchReserves();
  }, []);

  const fetchReserves = async () => {
    try {
      const response = await axios.get(`${API}/api/reserves`);
      setReserves(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Не удалось загрузить список заповедников:', error);
      setLoading(false);
    }
  };

  const scrollSlider = (direction) => {
    if (reserves.length === 0) return;
    
    if (direction === 'left') {
      // Циклическая прокрутка: если на первой карточке, переходим на последнюю
      const newIndex = activeIndex === 0 ? reserves.length - 1 : activeIndex - 1;
      setActiveIndex(newIndex);
    } else {
      // Циклическая прокрутка: если на последней карточке, переходим на первую
      const newIndex = activeIndex === reserves.length - 1 ? 0 : activeIndex + 1;
      setActiveIndex(newIndex);
    }
  };

  // Прокрутка при изменении activeIndex
  useEffect(() => {
    const cardsContainer = sliderRef.current;
    if (!cardsContainer || reserves.length === 0) return;

    isScrollingRef.current = true;

    // Активная карточка 1000px, соседняя 400px, gap 30px
    const activeCardWidth = 1000;
    const sideCardWidth = 400;
    const gap = 30;
    
    // Прокручиваем так, чтобы активная карточка была по центру экрана
    // Сначала находим позицию начала активной карточки
    const cardStartPosition = activeIndex * (activeCardWidth + sideCardWidth + gap);
    // Затем центрируем: центр контейнера минус половина активной карточки
    const containerWidth = cardsContainer.clientWidth;
    const targetScroll = cardStartPosition - (containerWidth / 2) + (activeCardWidth / 2);
    
    cardsContainer.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: 'smooth'
    });

    // Сбрасываем флаг после завершения прокрутки
    const timeoutId = setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [activeIndex, reserves.length]);

  return (
    <section id="reserves" className="reserves-map-section">
      <div className="container reserves-container">
        <h2 className="section-title">
          {language === 'en' ? 'Reserves of Belarus' : 'Заповедники Беларуси'}
        </h2>
        <p className="section-subtitle">
          {language === 'en'
            ? 'Explore the reserves of Belarus using cards with brief information and links to detailed pages'
            : 'Изучайте заповедники Беларуси с помощью карточек с краткой информацией и переходом на детальные страницы'}
        </p>

        {loading ? (
          <div className="loading">
            {language === 'en' ? 'Loading data...' : 'Загрузка данных...'}
          </div>
        ) : (
          <div className="reserves-slider">
            {/* Стрелки всегда видны для бесконечного скролла */}
            <button
              type="button"
              className="slider-arrow slider-arrow-left"
              onClick={() => scrollSlider('left')}
              aria-label="Прокрутить влево"
            >
              ‹
            </button>

            <div className="reserves-cards-wrapper">
              <div className="reserves-cards" ref={sliderRef}>
                {reserves.map((reserve, index) => {
                  // Циклическое определение соседних карточек
                  const prevIndex = activeIndex === 0 ? reserves.length - 1 : activeIndex - 1;
                  const nextIndex = activeIndex === reserves.length - 1 ? 0 : activeIndex + 1;
                  
                  const isActive = index === activeIndex;
                  const isPrev = index === prevIndex && !isActive;
                  const isNext = index === nextIndex && !isActive;
                  
                  const cardContent = (
                    <>
                      <div
                        className="reserve-card-image"
                        style={{
                          backgroundImage: `url(${reserve.image})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="reserve-card-gradient" />
                        <div className="reserve-card-content">
                          <div className="reserve-card-tags">
                            <span className="reserve-tag">
                              <Icon name="area" size={12} /> {parseInt(reserve.area).toLocaleString()} {language === 'en' ? 'ha' : 'га'}
                            </span>
                            <span className="reserve-tag">
                              <Icon name="calendar" size={12} /> {reserve.established}
                            </span>
                          </div>
                          <h4>{language === 'en' ? (reserve.name_en || reserve.name) : reserve.name}</h4>
                          <p className="reserve-card-description">
                            {(language === 'en' ? (reserve.description_en || reserve.description) : reserve.description || '').substring(0, 100)}...
                          </p>
                          {isActive && (
                            <span className="reserve-card-cta">
                              {language === 'en' ? 'Explore →' : 'Подробнее →'}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                  
                  // Используем order для правильного визуального порядка: prev (0) -> active (1) -> next (2)
                  const cardOrder = isPrev ? 0 : isActive ? 1 : isNext ? 2 : 999;
                  
                  // Только активная карточка кликабельна
                  if (isActive) {
                    return (
                      <Link
                        key={`${reserve.id}-${index}`}
                        to={`/reserve/${reserve.id}`}
                        className="reserve-card square active"
                        style={{ order: cardOrder }}
                      >
                        {cardContent}
                      </Link>
                    );
                  }
                  
                  // Остальные карточки (prev, next, hidden) - CSS скроет ненужные
                  return (
                    <div
                      key={`${reserve.id}-${index}`}
                      className={`reserve-card square ${isPrev ? 'prev' : ''} ${isNext ? 'next' : ''}`}
                      style={{ order: cardOrder }}
                    >
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="slider-arrow slider-arrow-right"
              onClick={() => scrollSlider('right')}
              aria-label="Прокрутить вправо"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReservesMap;

