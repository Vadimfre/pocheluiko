import React, { useState, useEffect } from 'react';
import './WeatherWidget.css';
import { useLanguage } from '../LanguageContext';
import API from '../config';

// SVG иконки погоды
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const CloudSunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M4.93 19.07l1.41-1.41" stroke="#f59e0b"/>
    <circle cx="9" cy="9" r="3" stroke="#f59e0b"/>
    <path d="M17 18a4 4 0 0 0 0-8 5 5 0 0 0-9.9-1" stroke="#6b7280"/>
    <path d="M9 18h8" stroke="#6b7280"/>
  </svg>
);

const CloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>
);

const FogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="8" x2="21" y2="8"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="16" x2="21" y2="16"/>
  </svg>
);

const RainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16" y1="13" x2="16" y2="21"/>
    <line x1="8" y1="13" x2="8" y2="21"/>
    <line x1="12" y1="15" x2="12" y2="23"/>
    <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#6b7280"/>
  </svg>
);

const SnowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 7l-5 5-5-5"/>
    <path d="M17 17l-5-5-5 5"/>
    <path d="M2 12l5-3-5-3"/>
    <path d="M22 12l-5-3 5-3"/>
  </svg>
);

const ThunderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" stroke="#6b7280"/>
    <polyline points="13 11 9 17 15 17 11 23" stroke="#f59e0b"/>
  </svg>
);

const DrizzleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="19" x2="8" y2="21"/>
    <line x1="8" y1="13" x2="8" y2="15"/>
    <line x1="16" y1="19" x2="16" y2="21"/>
    <line x1="16" y1="13" x2="16" y2="15"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="12" y1="15" x2="12" y2="17"/>
    <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#6b7280"/>
  </svg>
);

const WeatherIcon = ({ code }) => {
  if (code === 0) return <SunIcon />;
  if (code <= 3) return <CloudSunIcon />;
  if (code <= 48) return <FogIcon />;
  if (code <= 55) return <DrizzleIcon />;
  if (code <= 67) return <RainIcon />;
  if (code <= 77) return <SnowIcon />;
  if (code <= 82) return <RainIcon />;
  if (code <= 86) return <SnowIcon />;
  if (code <= 99) return <ThunderIcon />;
  return <CloudIcon />;
};

// SVG иконки для UI
const ThermometerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const DropIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);

const WeatherWidget = ({ reserveId, reserveName }) => {
  const { language } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/reserves/${reserveId}/weather`);
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        setWeather(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (reserveId) fetchWeather();
  }, [reserveId]);

  const getWeatherDescription = (code) => {
    const d = {
      ru: { 0:'Ясно',1:'Преим. ясно',2:'Перем. облачно',3:'Облачно',45:'Туман',48:'Изморозь',51:'Лёгкая морось',53:'Морось',55:'Сильная морось',61:'Небольшой дождь',63:'Дождь',65:'Сильный дождь',71:'Небольшой снег',73:'Снег',75:'Сильный снег',80:'Ливень',95:'Гроза' },
      en: { 0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',61:'Slight rain',63:'Rain',65:'Heavy rain',71:'Slight snow',73:'Snow',75:'Heavy snow',80:'Showers',95:'Thunderstorm' }
    };
    return (d[language === 'en' ? 'en' : 'ru'][code]) || (language === 'en' ? 'Unknown' : 'Неизвестно');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { weekday: 'short', day: 'numeric' });
  };

  const t = (ru, en) => language === 'en' ? en : ru;

  if (loading) return <div className="weather-widget"><div className="weather-loading">{t('Загрузка погоды...', 'Loading weather...')}</div></div>;
  if (error) return <div className="weather-widget"><div className="weather-error">{t('Не удалось загрузить погоду', 'Failed to load weather')}</div></div>;
  if (!weather) return null;

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <span className="weather-header-icon"><ThermometerIcon /></span>
        <h3 className="weather-title">{t('Погода в заповеднике', 'Weather forecast')}</h3>
        <span className="weather-subtitle">{t('Прогноз на 7 дней', '7-day forecast')}</span>
      </div>

      <div className="weather-forecast">
        {weather.forecast.map((day, i) => (
          <div key={i} className="weather-day">
            <div className="weather-day-name">{formatDate(day.date)}</div>
            <div className="weather-icon-wrap">
              <WeatherIcon code={day.weather_code} />
            </div>
            <div className="weather-temp">
              <span className="temp-max">{Math.round(day.temp_max)}°</span>
              <span className="temp-sep">/</span>
              <span className="temp-min">{Math.round(day.temp_min)}°</span>
            </div>
            <div className="weather-desc">{getWeatherDescription(day.weather_code)}</div>
            {day.precipitation > 0 && (
              <div className="weather-precip">
                <DropIcon /> {day.precipitation.toFixed(1)} {t('мм', 'mm')}
              </div>
            )}
          </div>
        ))}
      </div>

      {weather.recommendations && (
        <div className="weather-recommendations">
          <h4 className="recommendations-title">
            <LightbulbIcon />
            {t('Рекомендации для посещения', 'Visit recommendations')}
          </h4>

          {weather.recommendations.best_days.length > 0 && (
            <div className="recommendation-section best-days">
              <h5><CheckIcon /> {t('Лучшие дни', 'Best days')}</h5>
              <ul>
                {weather.recommendations.best_days.map((item, idx) => (
                  <li key={idx}><strong>{item.day}</strong> ({formatDate(item.date)}): {item.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {weather.recommendations.caution_days.length > 0 && (
            <div className="recommendation-section caution-days">
              <h5><AlertIcon /> {t('Требуется осторожность', 'Caution advised')}</h5>
              <ul>
                {weather.recommendations.caution_days.map((item, idx) => (
                  <li key={idx}><strong>{item.day}</strong> ({formatDate(item.date)}): {item.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {weather.recommendations.general_advice.length > 0 && (
            <div className="recommendation-section general-advice">
              <h5>{t('Общие советы', 'General advice')}</h5>
              <ul>
                {weather.recommendations.general_advice.map((advice, idx) => (
                  <li key={idx}>{advice}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
