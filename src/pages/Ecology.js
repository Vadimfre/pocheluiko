import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Ecology.css';
import { useLanguage } from '../LanguageContext';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';


const Ecology = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const [activeTopic, setActiveTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slideDir, setSlideDir] = useState('next'); // 'next' | 'prev'
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/ecology/topics`)
      .then(r => r.json())
      .then(data => {
        setTopics(data);
        if (data.length > 0) setActiveTopic(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (location.hash && topics.length > 0) {
      const topicId = location.hash.substring(1);
      if (topics.find(t => t.id === topicId)) setActiveTopic(topicId);
    }
  }, [location.hash, topics]);

  const activeTopicData = topics.find(t => t.id === activeTopic);
  const activeIndex = topics.findIndex(t => t.id === activeTopic);

  const handleTopicClick = (topicId, direction = 'next') => {
    setSlideDir(direction);
    setAnimKey(k => k + 1);
    setActiveTopic(topicId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const paragraphs = activeTopicData
    ? (language === 'en' ? activeTopicData.paragraphs_en : activeTopicData.paragraphs_ru)
    : [];

  return (
    <div className="eco-page">

      {/* ── Top nav bar ── */}
      <Breadcrumb items={[
        { label: language === 'en' ? 'Home' : 'Главная', to: '/' },
        { label: language === 'en' ? 'Ecology' : 'Экология' },
      ]} />

      {loading ? (
        <div className="eco-loading">
          <div className="eco-spinner" />
        </div>
      ) : (
        <div className="eco-shell">

          {/* ── Left sidebar ── */}
          <aside className="eco-sidebar">
            <div className="eco-sidebar-top">
              <p className="eco-sidebar-eyebrow">
                {language === 'en' ? 'Topics' : 'Темы'}
              </p>
              <h2 className="eco-sidebar-heading">
                {language === 'en' ? 'Ecology & Environment' : 'Экология и среда'}
              </h2>
              <p className="eco-sidebar-sub">
                {language === 'en'
                  ? 'Select a topic to explore'
                  : 'Выберите тему для изучения'}
              </p>
            </div>

            <nav className="eco-nav">
              {topics.map((topic, idx) => (
                <button
                  key={topic.id}
                  className={`eco-nav-item ${activeTopic === topic.id ? 'active' : ''}`}
                  onClick={() => handleTopicClick(topic.id, idx > activeIndex ? 'next' : 'prev')}
                >
                  <span className="eco-nav-index">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="eco-nav-icon">
                    <Icon name={topic.id} size={15} />
                  </span>
                  <span className="eco-nav-label">
                    {language === 'en' ? topic.title_en : topic.title_ru}
                  </span>
                  <span className="eco-nav-tick" />
                </button>
              ))}
            </nav>

            <div className="eco-sidebar-progress">
              <div className="eco-progress-bar">
                <div
                  className="eco-progress-fill"
                  style={{ width: `${topics.length ? ((activeIndex + 1) / topics.length) * 100 : 0}%` }}
                />
              </div>
              <span className="eco-progress-label">
                {activeIndex + 1} / {topics.length}
              </span>
            </div>
          </aside>

          {/* ── Right content ── */}
          <main className="eco-content">
            {activeTopicData ? (
              <article className="eco-article" key={animKey} data-dir={slideDir}>

                {/* Hero strip */}
                <div className="eco-article-hero">
                  <div className="eco-article-hero-icon">
                    <Icon name={activeTopicData.id} size={32} />
                  </div>
                  <div className="eco-article-hero-meta">
                    <span className="eco-article-num">
                      {String(activeIndex + 1).padStart(2, '0')} / {String(topics.length).padStart(2, '0')}
                    </span>
                    <h1 className="eco-article-title">
                      {language === 'en'
                        ? activeTopicData.content_title_en
                        : activeTopicData.content_title_ru}
                    </h1>
                  </div>
                </div>

                {/* Body */}
                <div className="eco-article-body">
                  {paragraphs.map((para, i) => (
                    <p key={i} className={`eco-p ${i === 0 ? 'eco-p--lead' : ''}`}>
                      {para}
                    </p>
                  ))}
                </div>

                {/* Prev / Next */}
                <div className="eco-article-footer">
                  <button
                    className="eco-foot-btn"
                    disabled={activeIndex === 0}
                    onClick={() => handleTopicClick(topics[activeIndex - 1].id, 'prev')}
                  >
                    ← {language === 'en' ? 'Previous' : 'Назад'}
                  </button>
                  <div className="eco-foot-dots">
                    {topics.map((t, i) => (
                      <button
                        key={t.id}
                        className={`eco-dot ${activeTopic === t.id ? 'active' : ''}`}
                        data-dir={activeTopic === t.id ? slideDir : undefined}
                        onClick={() => handleTopicClick(t.id, i > activeIndex ? 'next' : 'prev')}
                        aria-label={t.id}
                      />
                    ))}
                  </div>
                  <button
                    className="eco-foot-btn"
                    disabled={activeIndex === topics.length - 1}
                    onClick={() => handleTopicClick(topics[activeIndex + 1].id, 'next')}
                  >
                    {language === 'en' ? 'Next' : 'Далее'} →
                  </button>
                </div>

              </article>
            ) : (
              <div className="eco-empty">
                {language === 'en' ? 'Select a topic' : 'Выберите тему'}
              </div>
            )}
          </main>

        </div>
      )}
    </div>
  );
};

export default Ecology;
