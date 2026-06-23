import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ReserveBooking.css';
import './ReserveExcursions.css';
import { useLanguage } from '../LanguageContext';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

const ReserveExcursions = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const t = (ru, en) => language === 'en' ? en : ru;

  const [reserve, setReserve] = useState(null);
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userExcursionIds, setUserExcursionIds] = useState([]);

  const [formData, setFormData] = useState({ guest_name: '', guest_email: '', guests: 1 });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ecology_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [resReserve, resExc] = await Promise.all([
          axios.get(`${API}/api/reserves/${id}`),
          axios.get(`${API}/api/reserves/${id}/excursions`),
        ]);
        setReserve(resReserve.data);
        setExcursions(resExc.data);
        if (resExc.data.length > 0) setSelected(resExc.data[0]);
      } catch {}
      setLoading(false);
    };
    load();

    // Предзаполняем из localStorage
    const stored = localStorage.getItem('ecology_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setFormData(p => ({ ...p, guest_name: user.name || '', guest_email: user.email || '' }));
        fetch(`${API}/api/users/${user.id}/excursions`)
          .then(r => r.json())
          .then(data => setUserExcursionIds(data.map(e => e.excursion_id)));
      } catch {}
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: name === 'guests' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selected) {
      setErrorMessage(t('Выберите экскурсию', 'Please select an excursion'));
      return;
    }

    const stored = localStorage.getItem('ecology_user');
    const user = stored ? JSON.parse(stored) : null;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/excursions/${selected.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user_id: user?.id || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(t(
          'Вы успешно записаны на экскурсию! Мы свяжемся с вами по указанной почте.',
          'You have successfully signed up for the excursion! We will contact you by email.'
        ));
        setUserExcursionIds(prev => [...prev, selected.id]);
        // Обновляем список (счётчик мест)
        const resExc = await axios.get(`${API}/api/reserves/${id}/excursions`);
        setExcursions(resExc.data);
        setSelected(resExc.data.find(e => e.id === selected.id) || null);
      } else {
        setErrorMessage(data.error || t('Ошибка записи', 'Registration error'));
      }
    } catch {
      setErrorMessage(t('Ошибка сети', 'Network error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    const stored = localStorage.getItem('ecology_user');
    if (!stored) return;
    const user = JSON.parse(stored);
    await fetch(`${API}/api/excursions/${selected.id}/cancel`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_email: user.email }),
    });
    setUserExcursionIds(prev => prev.filter(i => i !== selected.id));
    setSuccessMessage(t('Запись отменена', 'Registration cancelled'));
    const resExc = await axios.get(`${API}/api/reserves/${id}/excursions`);
    setExcursions(resExc.data);
    setSelected(resExc.data.find(e => e.id === selected.id) || null);
  };

  if (loading) {
    return (
      <div className="reserve-booking-page">
        <div className="loading-container">
          <div className="loading">{t('Загрузка...', 'Loading...')}</div>
        </div>
      </div>
    );
  }

  if (!reserve) {
    return (
      <div className="reserve-booking-page">
        <div className="error-container">
          <h2>{t('Заповедник не найден', 'Reserve not found')}</h2>
          <Link to="/" className="btn btn-primary">{t('На главную', 'Home')}</Link>
        </div>
      </div>
    );
  }

  const isRegistered = selected && userExcursionIds.includes(selected.id);
  const isFull = selected && selected.registered >= selected.max_participants;

  return (
    <div className="reserve-booking-page">
      <Breadcrumb items={[
        { label: t('Главная', 'Home'), to: '/' },
        { label: language === 'en' ? (reserve.name_en || reserve.name) : reserve.name, to: `/reserve/${id}` },
        { label: t('Экскурсии', 'Excursions') },
      ]} />
      {/* Hero */}
      <div className="reserve-booking-hero">
        <div
          className="reserve-booking-hero-image"
          style={{ backgroundImage: `url(${reserve.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="reserve-booking-hero-overlay" />
          <div className="container">
            <div className="reserve-booking-hero-content">
              <Link to={`/reserve/${id}`} className="back-button">
                ← {t('Назад к заповеднику', 'Back to reserve')}
              </Link>
              <h1>{t('Экскурсии', 'Excursions')}</h1>
              <p className="reserve-booking-subtitle">{t('Заповедник', 'Reserve')}: {language === 'en' ? (reserve.name_en || reserve.name) : reserve.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="reserve-booking-content">
        <div className="container">
          <div className="reserve-booking-layout">

            {/* Left — excursion list */}
            <div className="booking-cabins">
              <h2>{t('Доступные экскурсии', 'Available excursions')}</h2>
              {excursions.length === 0 ? (
                <p className="booking-note">
                  {t('Экскурсий пока не запланировано. Загляните позже.', 'No excursions planned yet. Check back later.')}
                </p>
              ) : (
                <div className="cabins-list">
                  {excursions.map(exc => {
                    const full = exc.registered >= exc.max_participants;
                    const reg  = userExcursionIds.includes(exc.id);
                    return (
                      <button
                        key={exc.id}
                        type="button"
                        className={`cabin-card exc-card ${selected?.id === exc.id ? 'selected' : ''} ${full && !reg ? 'exc-full' : ''}`}
                        onClick={() => { setSelected(exc); setSuccessMessage(''); setErrorMessage(''); }}
                      >
                        <div className="exc-card-header">
                          <h3>{exc.title}</h3>
                          <div className="exc-card-badges">
                            {reg  && <span className="exc-badge badge-reg">{t('✓ Записан', '✓ Registered')}</span>}
                            {full && !reg && <span className="exc-badge badge-full">{t('Мест нет', 'Full')}</span>}
                          </div>
                        </div>
                        {exc.description && <p className="cabin-description">{exc.description}</p>}
                        <div className="cabin-info exc-meta">
                          <span><Icon name="calendar" size={13} /> {exc.date} &nbsp;<Icon name="time" size={13} /> {exc.time}{exc.duration ? ` · ${exc.duration}` : ''}</span>
                          <span><Icon name="users" size={13} /> {exc.registered}/{exc.max_participants}{exc.price > 0 ? ` · ${exc.price} BYN` : ''}</span>
                        </div>
                        {exc.guide && <div className="exc-guide"><Icon name="guide" size={13} /> {exc.guide}</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right — form */}
            <div className="booking-form-wrapper">
              <h2>{t('Записаться на экскурсию', 'Sign up for excursion')}</h2>

              {/* Excursion details */}
              {selected && (
                <div className="excursion-details">
                  <h3>{selected.title}</h3>
                  {selected.description && (
                    <div className="excursion-detail-section">
                      <h4>{t('Описание', 'Description')}</h4>
                      <p>{selected.description}</p>
                    </div>
                  )}
                  {selected.what_to_expect && (
                    <div className="excursion-detail-section">
                      <h4>{t('Что вас ожидает', 'What to expect')}</h4>
                      <p>{selected.what_to_expect}</p>
                    </div>
                  )}
                  {selected.route && (
                    <div className="excursion-detail-section">
                      <h4>{t('Маршрут', 'Route')}</h4>
                      <p>{selected.route}</p>
                    </div>
                  )}
                </div>
              )}

              {!currentUser ? (
                <div className="auth-required-block">
                  <div className="auth-required-icon">
                    <Icon name="lock" size={40} />
                  </div>
                  <p className="auth-required-text">
                    {t(
                      'Для записи на экскурсию необходимо войти или зарегистрироваться.',
                      'Please log in or register to sign up for an excursion.'
                    )}
                  </p>
                  <Link to="/account" className="btn btn-primary">
                    {t('Войти / Зарегистрироваться', 'Log in / Register')}
                  </Link>
                </div>
              ) : (
              <>
              <p className="booking-note">
                {t(
                  'Заполните форму ниже, и сотрудники заповедника свяжутся с вами для подтверждения.',
                  'Fill in the form below and the reserve staff will contact you to confirm.'
                )}
              </p>

              {errorMessage   && <div className="booking-alert error">{errorMessage}</div>}
              {successMessage && <div className="booking-alert success">{successMessage}</div>}

              {selected && isRegistered ? (
                <div className="exc-registered-block">
                  <p className="exc-registered-text">
                    {t(`Вы уже записаны на «${selected.title}»`, `You are registered for "${language === 'en' ? (selected.title_en || selected.title) : selected.title}"`)}
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    {t('Отменить запись', 'Cancel registration')}
                  </button>
                </div>
              ) : (
                <form className="booking-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="exc_name">{t('Ваше имя', 'Your name')}</label>
                    <input id="exc_name" name="guest_name" type="text" value={formData.guest_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exc_email">{t('Электронная почта', 'Email address')}</label>
                    <input id="exc_email" name="guest_email" type="email" value={formData.guest_email} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exc_guests">{t('Количество человек', 'Number of people')}</label>
                    <input
                      id="exc_guests" name="guests" type="number" min="1"
                      max={selected ? selected.max_participants - selected.registered : 10}
                      value={formData.guests} onChange={handleChange} required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary booking-submit"
                    disabled={submitting || !selected || isFull || excursions.length === 0}
                  >
                    {submitting
                      ? t('Отправка...', 'Sending...')
                      : t('Записаться на экскурсию', 'Sign up for excursion')}
                  </button>
                </form>
              )}
              </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveExcursions;
