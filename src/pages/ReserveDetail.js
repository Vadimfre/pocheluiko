import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import './ReserveDetail.css';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../LanguageContext';
import WeatherWidget from '../components/WeatherWidget';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

// Исправление иконок маркеров для Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ReserveDetail = () => {
  const { id } = useParams();
  const [reserve, setReserve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const { language } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteReserveId, setFavoriteReserveId] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  const getAnimalExcerpt = (text, maxLen = 95) => {
    if (!text) return '';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen)}...`;
  };

  useEffect(() => {
    let cancelled = false;

    const fetchReserve = async () => {
      try {
        const response = await axios.get(`${API}/api/reserves/${id}`);
        if (!cancelled) {
          setReserve(response.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        if (!cancelled) setLoading(false);
      }
    };

    const fetchAnimals = async () => {
      try {
        const response = await axios.get(`${API}/api/reserves/${id}/animals`);
        if (!cancelled) {
          setAnimals(response.data);
          setAnimalsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка загрузки списка животных:', error);
        if (!cancelled) setAnimalsLoading(false);
      }
    };

    setLoading(true);
    setAnimalsLoading(true);
    fetchReserve();
    fetchAnimals();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const stored = localStorage.getItem('ecology_user');
    if (!stored) return;

    let cancelled = false;

    const loadFavoriteStateForUser = async (userId) => {
      try {
        const res = await fetch(`${API}/api/users/${userId}/favorites`);
        const data = await res.json();
        if (cancelled) return;
        const currentId = Number(id);
        const favorites = data.favorites || [];
        setIsFavorite(favorites.some((r) => r.id === currentId));
        setFavoriteReserveId(data.favorite_reserve_id || null);
      } catch {
        // ignore
      }
    };

    try {
      const user = JSON.parse(stored);
      loadFavoriteStateForUser(user.id);
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadFavoriteState = async (userId) => {
    try {
      const res = await fetch(`${API}/api/users/${userId}/favorites`);
      const data = await res.json();
      const currentId = Number(id);
      const favorites = data.favorites || [];
      setIsFavorite(favorites.some((r) => r.id === currentId));
      setFavoriteReserveId(data.favorite_reserve_id || null);
    } catch {
      // ignore
    }
  };

  const toggleFavorite = async () => {
    const stored = localStorage.getItem('ecology_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const reserveId = Number(id);

    try {
      if (isFavorite) {
        await fetch(
          `${API}/api/users/${user.id}/favorites/${reserveId}`,
          { method: 'DELETE' }
        );
      } else {
        await fetch(`${API}/api/users/${user.id}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reserve_id: reserveId }),
        });
      }
      // После изменения статуса всегда обновляем состояние из API,
      // чтобы оно совпадало с тем, что видит страница аккаунта.
      await loadFavoriteState(user.id);
    } catch {
      // ignore
    }
  };

  const setAsMainFavorite = async () => {
    const stored = localStorage.getItem('ecology_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    const reserveId = Number(id);

    try {
      const res = await fetch(
        `${API}/api/users/${user.id}/favorite-reserve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reserve_id: reserveId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setFavoriteReserveId(data.favorite_reserve_id);
        const updatedUser = { ...user, favorite_reserve_id: data.favorite_reserve_id };
        localStorage.setItem('ecology_user', JSON.stringify(updatedUser));
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="reserve-detail-page">
        <div className="loading-container">
          <div className="loading">
            {language === 'en' ? 'Loading data...' : 'Загрузка данных...'}
          </div>
        </div>
      </div>
    );
  }

  if (!reserve) {
    return (
      <div className="reserve-detail-page">
        <div className="error-container">
          <h2>
            {language === 'en' ? 'Reserve not found' : 'Заповедник не найден'}
          </h2>
          <Link to="/" className="btn btn-primary">
            {language === 'en' ? 'Back to home' : 'Вернуться на главную'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reserve-detail-page">
      <Breadcrumb items={[
        { label: language === 'en' ? 'Home' : 'Главная', to: '/' },
        { label: language === 'en' ? (reserve.name_en || reserve.name) : reserve.name },
      ]} />
      <div className="reserve-detail-hero">
        <div 
          className="reserve-hero-image"
          style={{
            backgroundImage: `url(${reserve.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="reserve-hero-overlay"></div>
          <div className="container">
            <div className="reserve-hero-content">
              <h1>{language === 'en' ? (reserve.name_en || reserve.name) : reserve.name}</h1>
              <p className="reserve-hero-subtitle">
                {language === 'en'
                  ? 'Protected natural area of the Republic of Belarus'
                  : 'Охраняемая природная территория Республики Беларусь'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="reserve-detail-content">
        <div className="container">
          <div className="reserve-main-info">
            <div className="reserve-description-section">
              {/* Вкладки */}
              <div className="reserve-tabs">
                {[
                  { key: 'description', ru: 'Описание',  en: 'Description' },
                  { key: 'facts',       ru: 'Факты',     en: 'Facts' },
                  { key: 'animals',     ru: 'Животные',  en: 'Wildlife' },
                  { key: 'weather',     ru: 'Погода',    en: 'Weather' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`reserve-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {language === 'en' ? tab.en : tab.ru}
                  </button>
                ))}
              </div>

              {/* Описание */}
              {activeTab === 'description' && (
                <>
                  <p className="reserve-description">
                    {language === 'en' ? (reserve.description_en || reserve.description) : reserve.description}
                  </p>
                  {reserve.gallery && reserve.gallery.length > 0 && (
                    <div className="reserve-gallery">
                      <h3>{language === 'en' ? 'Photo gallery' : 'Фотогалерея'}</h3>
                      <div className="reserve-gallery-grid">
                        {reserve.gallery.map((image, index) => (
                          <div key={index} className="reserve-gallery-item">
                            <div className="reserve-gallery-image" style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="reserve-features">
                    <h3>{language === 'en' ? 'Features' : 'Особенности'}</h3>
                    <ul className="features-list">
                      {(language === 'en' ? (reserve.features_en || reserve.features) : reserve.features).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Факты */}
              {activeTab === 'facts' && reserve.facts && (
                <div className="reserve-facts">
                  <table className="facts-table">
                    <tbody>
                      {(language === 'en' ? reserve.facts.en : reserve.facts.ru).map((fact, i) => (
                        <tr key={i}>
                          <td className="facts-label">{fact.label}</td>
                          <td className="facts-value">{fact.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Животные */}
              {activeTab === 'animals' && (
                <div className="reserve-animals">
                  {animalsLoading ? (
                    <p>{language === 'en' ? 'Loading...' : 'Загрузка...'}</p>
                  ) : animals.length === 0 ? (
                    <p>{language === 'en' ? 'No data available.' : 'Информация отсутствует.'}</p>
                  ) : (
                    <ul className="animals-list">
                      {animals.map((animal) => {
                        const rawDesc = animal.description;
                        const hasDesc =
                          typeof rawDesc === 'string' && rawDesc.trim().length > 0;
                        const excerpt = hasDesc ? getAnimalExcerpt(rawDesc) : '';

                        const fallbackText = language === 'en'
                          ? `${animal.species} is one of the characteristic species of this reserve.`
                          : `${animal.name} — один из характерных видов этого заповедника.`;

                        return (
                          <li key={animal.id} className="animal-item">
                            <h4>{language === 'en' ? animal.species : animal.name}</h4>
                            {language === 'en' && (
                              <p className="animal-species">
                                {animal.name}
                              </p>
                            )}

                            <p className="animal-description">
                              {excerpt || fallbackText}
                            </p>

                            {hasDesc && (
                              <p className="animal-source">
                                {language === 'en'
                                  ? 'Source: Wikipedia (summary)'
                                  : 'Источник: Википедия (кратко)'}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Погода */}
              {activeTab === 'weather' && (
                <WeatherWidget reserveId={id} reserveName={language === 'en' ? (reserve.name_en || reserve.name) : reserve.name} />
              )}

            </div>
            <div className="reserve-info-cards">
              <div className="info-card">
                <div className="info-card-icon"><Icon name="area" size={28} /></div>
                <div className="info-card-content">
                  <h4>{language === 'en' ? 'Area' : 'Площадь'}</h4>
                  <p className="info-card-value">{parseInt(reserve.area).toLocaleString()} {language === 'en' ? 'ha' : 'га'}</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><Icon name="calendar" size={28} /></div>
                <div className="info-card-content">
                  <h4>{language === 'en' ? 'Established' : 'Год основания'}</h4>
                  <p className="info-card-value">{reserve.established}</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><Icon name="pin" size={28} /></div>
                <div className="info-card-content">
                  <h4>{language === 'en' ? 'Coordinates' : 'Координаты'}</h4>
                  <p className="info-card-value">
                    {reserve.location.lat.toFixed(4)}, {reserve.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><Icon name="cabin" size={28} /></div>
                <div className="info-card-content">
                  <h4>
                    {language === 'en' ? 'Cabin booking' : 'Бронирование домиков'}
                  </h4>
                  <Link to={`/reserve/${id}/booking`} className="info-card-btn">
                    {language === 'en' ? 'Book online →' : 'Онлайн-бронирование →'}
                  </Link>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><Icon name="excursion" size={28} /></div>
                <div className="info-card-content">
                  <h4>
                    {language === 'en' ? 'Excursions' : 'Экскурсии'}
                  </h4>
                  <Link to={`/reserve/${id}/excursions`} className="info-card-btn">
                    {language === 'en' ? 'View & sign up →' : 'Просмотр и запись →'}
                  </Link>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><Icon name="star" size={28} /></div>
                <div className="info-card-content">
                  <h4>
                    {language === 'en'
                      ? 'Favourite reserve'
                      : 'Избранный заповедник'}
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary reserve-fav-btn"
                    onClick={toggleFavorite}
                  >
                    {isFavorite
                      ? language === 'en'
                        ? 'Remove from favourites'
                        : 'Убрать из избранного'
                      : language === 'en'
                        ? 'Add to favourites'
                        : 'Добавить в избранное'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary reserve-fav-main-btn"
                    onClick={setAsMainFavorite}
                    disabled={!isFavorite}
                  >
                    {favoriteReserveId === Number(id)
                      ? language === 'en'
                        ? 'Main reserve selected'
                        : 'Выбран как основной'
                      : language === 'en'
                        ? 'Set as main reserve'
                        : 'Сделать основным'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="reserve-map-section">
            <h2>
              {language === 'en' ? 'Location on the map' : 'Расположение на карте'}
            </h2>
            <div className="reserve-map-container">
              <MapContainer
                center={[reserve.location.lat, reserve.location.lng]}
                zoom={10}
                style={{ height: '500px', width: '100%', borderRadius: '10px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[reserve.location.lat, reserve.location.lng]}>
                  <Popup>
                    <strong>{language === 'en' ? (reserve.name_en || reserve.name) : reserve.name}</strong>
                    <br />
                    {language === 'en' ? (reserve.description_en || reserve.description) : reserve.description}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div className="reserve-additional-info">
            <h2>
              {language === 'en' ? 'Additional information' : 'Дополнительная информация'}
            </h2>
            <div className="additional-content">
              <p>
                {language === 'en'
                  ? 'This reserve is an important part of the natural heritage of Belarus. It plays a key role in preserving biodiversity and the ecological balance of the region.'
                  : 'Данный заповедник является важной частью природного наследия Беларуси. Он играет ключевую роль в сохранении биоразнообразия и экологического баланса региона.'}
              </p>
              <p>
                {language === 'en'
                  ? 'Visiting the reserve is possible only as part of organized excursions and in compliance with all nature protection rules. We urge all visitors to treat nature with care and follow ecological principles.'
                  : 'Посещение заповедника возможно только в рамках организованных экскурсий и с соблюдением всех правил охраны природы. Мы призываем всех посетителей бережно относиться к природе и следовать экологическим принципам.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveDetail;

