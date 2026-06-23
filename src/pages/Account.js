import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Account.css';
import { useLanguage } from '../LanguageContext';
import AvatarDisplay from '../components/AvatarDisplay';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

const LOCAL_STORAGE_KEY = 'ecology_user';

const Account = () => {
  const { language } = useLanguage();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [favoriteReserveId, setFavoriteReserveId] = useState(null);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [editName, setEditName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [excursionsList, setExcursionsList] = useState([]);
  const [loadingExcursions, setLoadingExcursions] = useState(false);

  const t = useCallback((ru, en) => (language === 'en' ? en : ru), [language]);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId == null) return;
    fetchFavorites(Number(userId));
    fetchFeedback(Number(userId));
    fetchBookings(Number(userId));
    fetchNotifications(Number(userId));
    fetchExcursions(Number(userId));
  }, [userId]);

  useEffect(() => {
    const onFocus = () => {
      // Перечитываем пользователя из localStorage — аватар мог обновиться на странице профиля
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const fresh = JSON.parse(stored);
          setUser(prev => {
            if (!prev) return fresh;
            // Обновляем только если что-то изменилось
            if (prev.avatar !== fresh.avatar || prev.name !== fresh.name) return fresh;
            return prev;
          });
        } catch {}
      }
      if (userId == null) return;
      fetchFavorites(Number(userId));
      fetchFeedback(Number(userId));
      fetchBookings(Number(userId));
      fetchNotifications(Number(userId));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId]);


  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthData((prev) => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    // Проверка пустых обязательных полей
    if (mode === 'register' && !authData.name.trim()) {
      setAuthError(t('Необходимо заполнить поле «Имя»', 'Name field is required'));
      return;
    }
    if (!authData.email.trim() || !authData.password.trim()) {
      setAuthError(t('Необходимо заполнить все обязательные поля', 'Please fill in all required fields'));
      return;
    }

    // Проверка формата email
    if (!validateEmail(authData.email)) {
      setAuthError(t('Введён невалидный email. Проверьте правильность адреса', 'Invalid email address. Please check the format'));
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/users/register' : '/api/users/login';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      const data = await res.json();
      if (!res.ok) {
        if (mode === 'login') {
          setAuthError(t('Неверный email или пароль', 'Invalid email or password'));
        } else {
          setAuthError(data.error || t('Ошибка регистрации', 'Registration error'));
        }
        return;
      }
      setUser(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      setAuthData({ name: '', email: '', password: '' });
      fetchFavorites(Number(data.id));
      fetchFeedback(Number(data.id));
      fetchBookings(Number(data.id));
      fetchNotifications(Number(data.id));
    } catch {
      setAuthError(t('Не удалось связаться с сервером', 'Could not connect to the server'));
    }
  };

  const logout = () => {
    setUser(null);
    setFavorites([]);
    setFavoriteReserveId(null);
    setFeedbackList([]);
    setBookingsList([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const fetchFavorites = async (userId) => {
    const id = Number(userId);
    if (!id) return;
    setLoadingFavorites(true);
    try {
      const res = await fetch(`${API}/api/users/${id}/favorites`);
      const data = await res.json();
      setFavorites(Array.isArray(data.favorites) ? data.favorites : []);
      const mainId = data.favorite_reserve_id;
      setFavoriteReserveId(mainId != null && mainId !== undefined ? Number(mainId) : null);
    } catch {
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const fetchFeedback = async (userId) => {
    setLoadingFeedback(true);
    try {
      const res = await fetch(`${API}/api/users/${userId}/feedback`);
      const data = await res.json();
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch {
      setFeedbackList([]);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchBookings = async (userId) => {
    setLoadingBookings(true);
    try {
      const res = await fetch(`${API}/api/users/${userId}/bookings`);
      const data = await res.json();
      setBookingsList(Array.isArray(data) ? data : []);
    } catch {
      setBookingsList([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchExcursions = async (userId) => {
    setLoadingExcursions(true);
    try {
      const res = await fetch(`${API}/api/users/${userId}/excursions`);
      const data = await res.json();
      setExcursionsList(Array.isArray(data) ? data : []);
    } catch {
      setExcursionsList([]);
    } finally {
      setLoadingExcursions(false);
    }
  };


  const fetchNotifications = async (userId) => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API}/api/users/${userId}/notifications`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };


  const handleMarkNotificationRead = async (notificationId) => {
    if (!user) return;
    try {
      await fetch(`${API}/api/users/${user.id}/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      fetchNotifications(user.id);
    } catch {}
  };


  const handleClearNotifications = async () => {
    if (!user) return;
    if (!window.confirm(t('Очистить все уведомления?', 'Clear all notifications?'))) return;
    try {
      await fetch(`${API}/api/users/${user.id}/notifications`, { method: 'DELETE' });
      fetchNotifications(user.id);
    } catch {}
  };

  const handleClearFeedback = async () => {
    if (!user) return;
    if (!window.confirm(t('Очистить все обращения?', 'Clear all feedback?'))) return;
    try {
      await fetch(`${API}/api/users/${user.id}/feedback`, { method: 'DELETE' });
      fetchFeedback(user.id);
    } catch {}
  };

  const handleClearBookings = async () => {
    if (!user) return;
    if (!window.confirm(t('Очистить все бронирования?', 'Clear all bookings?'))) return;
    try {
      await fetch(`${API}/api/users/${user.id}/bookings`, { method: 'DELETE' });
      fetchBookings(user.id);
    } catch {}
  };


  const handleRemoveFavorite = async (reserveId) => {
    if (!user) return;
    try {
      await fetch(`${API}/api/users/${user.id}/favorites/${reserveId}`, { method: 'DELETE' });
      fetchFavorites(user.id);
    } catch {}
  };

  const handleSetFavoriteReserve = async (reserveId) => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/api/users/${user.id}/favorite-reserve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserve_id: reserveId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFavoriteReserveId(data.favorite_reserve_id != null ? Number(data.favorite_reserve_id) : null);
        const updatedUser = { ...user, favorite_reserve_id: data.favorite_reserve_id };
        setUser(updatedUser);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUser));
      }
    } catch {}
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    const name = (editName || '').trim();
    if (!name) {
      setProfileMessage(t('Введите имя', 'Enter name'));
      return;
    }
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({ ...prev, name: data.name }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...user, name: data.name }));
        setProfileMessage(t('Имя сохранено', 'Name saved'));
        setEditName('');
      } else {
        setProfileMessage(data.error || t('Ошибка', 'Error'));
      }
    } catch {
      setProfileMessage(t('Ошибка сети', 'Network error'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMessage(t('Пароли не совпадают', 'Passwords do not match'));
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMessage(t('Пароль не короче 6 символов', 'Password at least 6 characters'));
      return;
    }
    try {
      const res = await fetch(`${API}/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.new,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage(t('Пароль изменён', 'Password changed'));
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        setPasswordMessage(data.error || t('Ошибка', 'Error'));
      }
    } catch {
      setPasswordMessage(t('Ошибка сети', 'Network error'));
    }
  };

  const formatDate = (str) => {
    if (!str) return '';
    try {
      const d = new Date(str);
      return d.toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return str;
    }
  };

  return (
    <div className="account-page">
      <Breadcrumb items={[
        { label: t('Главная', 'Home'), to: '/' },
        { label: t('Личный кабинет', 'Account') },
      ]} />
      <div className="container">
        <div className={`account-layout ${user ? '' : 'account-layout--single'}`}>
          <section className="account-card">
            <h1 className="account-title">{t('Личный кабинет', 'Account')}</h1>
            {user ? (
              <>
                <div className="account-user-header">
                  <AvatarDisplay user={user} size="large" />
                  <div>
                    <p className="account-subtitle">
                      {t('Вы вошли как ', 'You are logged in as ')}
                      <strong>{user.name}</strong> ({user.email})
                    </p>
                  </div>
                </div>

                <div className="account-profile-block">
                  <h3 className="account-block-title">{t('Профиль', 'Profile')}</h3>
                  <Link to="/profile" className="account-edit-profile-link">
                    <span className="account-edit-profile-link-body">
                      <span className="account-edit-profile-link-title">
                        {t('Редактировать профиль', 'Edit profile')}
                      </span>
                      <span className="account-edit-profile-link-desc">
                        {t('Фото, имя и город', 'Photo, name and city')}
                      </span>
                    </span>
                    <span className="account-edit-profile-link-chevron" aria-hidden>
                      ›
                    </span>
                  </Link>
                  <form onSubmit={handleSaveProfile} className="account-inline-form">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('Новое имя', 'New name')}
                      className="account-inline-input"
                    />
                    <button type="submit" className="btn btn-secondary btn-sm">
                      {t('Сохранить имя', 'Save name')}
                    </button>
                  </form>
                  {profileMessage && <p className="account-message">{profileMessage}</p>}

                  <details className="account-details">
                    <summary>{t('Сменить пароль', 'Change password')}</summary>
                    <form onSubmit={handleChangePassword} className="account-form">
                      <div className="form-group">
                        <label>{t('Текущий пароль', 'Current password')}</label>
                        <input
                          type="password"
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('Новый пароль', 'New password')}</label>
                        <input
                          type="password"
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
                          minLength={6}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('Повторите пароль', 'Confirm password')}</label>
                        <input
                          type="password"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                          minLength={6}
                          required
                        />
                      </div>
                      {passwordMessage && <p className="account-message">{passwordMessage}</p>}
                      <button type="submit" className="btn btn-primary btn-sm">
                        {t('Изменить пароль', 'Change password')}
                      </button>
                    </form>
                  </details>
                </div>

                <button className="btn btn-secondary account-logout" onClick={logout}>
                  {t('Выйти', 'Log out')}
                </button>
                {user.is_admin && (
                  <Link to="/admin" className="btn btn-primary" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                    ⚙️ {t('Панель администратора', 'Admin Panel')}
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="account-subtitle">
                  {t(
                    'Зарегистрируйтесь или войдите, чтобы сохранять избранные заповедники и видеть историю.',
                    'Register or log in to save favourite reserves and view history.'
                  )}
                </p>
                <div className="account-tabs">
                  <button
                    type="button"
                    className={mode === 'login' ? 'tab active' : 'tab'}
                    onClick={() => setMode('login')}
                  >
                    {t('Вход', 'Login')}
                  </button>
                  <button
                    type="button"
                    className={mode === 'register' ? 'tab active' : 'tab'}
                    onClick={() => setMode('register')}
                  >
                    {t('Регистрация', 'Register')}
                  </button>
                </div>
                <form className="account-form" onSubmit={handleAuthSubmit}>
                  {mode === 'register' && (
                    <div className="form-group">
                      <label htmlFor="name">{t('Имя', 'Name')}</label>
                      <input id="name" name="name" type="text" value={authData.name} onChange={handleAuthChange} required />
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" value={authData.email} onChange={handleAuthChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">{t('Пароль', 'Password')}</label>
                    <input id="password" name="password" type="password" value={authData.password} onChange={handleAuthChange} required minLength={6} />
                  </div>
                  {authError && <div className="account-error">{authError}</div>}
                  <button type="submit" className="btn btn-primary">
                    {mode === 'register' ? t('Создать аккаунт', 'Create account') : t('Войти', 'Log in')}
                  </button>
                </form>
              </>
            )}
          </section>

          {user && (
            <div className="account-right-column">
              <section className="favorites-card">
                <h2>{t('Избранные заповедники', 'Favourite reserves')}</h2>
                <div className="favorites-toolbar">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fetchFavorites(user.id)}
                    disabled={loadingFavorites}
                  >
                    {t('Обновить список', 'Refresh list')}
                  </button>
                </div>
                {loadingFavorites ? (
                  <p>{t('Загрузка избранного...', 'Loading favourites...')}</p>
                ) : favorites.length === 0 ? (
                  <p>
                    {t(
                      'У вас пока нет избранных заповедников. Добавьте их на странице заповедника.',
                      'You do not have favourite reserves yet. Add them on the reserve page.'
                    )}
                  </p>
                ) : (
                  <ul className="favorites-list">
                    {favorites.map((reserve) => (
                      <li key={reserve.id} className="favorites-item">
                        <div className="favorites-item-info">
                          <Link to={`/reserve/${reserve.id}`} className="favorites-name">
                            {reserve.name}
                          </Link>
                          <div className="favorites-area">
                            {t('Площадь', 'Area')}: {parseInt(reserve.area || 0).toLocaleString()} {language === 'en' ? 'ha' : 'га'}
                          </div>
                        </div>
                        <div className="favorites-actions">
                          <button
                            type="button"
                            className={favoriteReserveId === reserve.id ? 'btn btn-secondary favorites-main-btn active' : 'btn btn-secondary favorites-main-btn'}
                            onClick={() => handleSetFavoriteReserve(reserve.id)}
                          >
                            {favoriteReserveId === reserve.id ? t('Основной', 'Main') : t('Сделать основным', 'Set main')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-remove"
                            onClick={() => handleRemoveFavorite(reserve.id)}
                            title={t('Удалить из избранного', 'Remove from favourites')}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="account-card account-feedback-card">
                <h2>{t('Мои обращения', 'My feedback')}</h2>
                {loadingFeedback ? (
                  <p>{t('Загрузка...', 'Loading...')}</p>
                ) : feedbackList.length === 0 ? (
                  <p className="account-empty">{t('Вы пока не отправляли обращений. Форма на странице Контакты.', 'You have not sent any feedback yet. Use the form on the Contact page.')}</p>
                ) : (
                  <>
                    <div className="section-toolbar">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearFeedback}
                      >
                        {t('Очистить обращения', 'Clear feedback')}
                      </button>
                    </div>
                    <ul className="account-feedback-list">
                      {feedbackList.map((item) => (
                        <li key={item.id} className="account-feedback-item">
                          <p className="account-feedback-message">{item.message}</p>
                          <span className="account-feedback-date">{formatDate(item.created_at)}</span>
                          {item.reply && (
                            <div className="account-feedback-reply">
                              <span className="account-feedback-reply-label">
                                ✉️ {t('Ответ администратора', 'Admin reply')}:
                              </span>
                              <p className="account-feedback-reply-text">{item.reply}</p>
                              <span className="account-feedback-date">{formatDate(item.reply_at)}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="account-card account-bookings-card">
                <h2>{t('Мои бронирования', 'My bookings')}</h2>
                {loadingBookings ? (
                  <p>{t('Загрузка...', 'Loading...')}</p>
                ) : bookingsList.length === 0 ? (
                  <p className="account-empty">
                    {t('У вас пока нет бронирований. Оформить можно на странице заповедника.', 'You have no bookings yet. You can book on a reserve page.')}
                  </p>
                ) : (
                  <>
                    <div className="section-toolbar">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearBookings}
                      >
                        {t('Очистить бронирования', 'Clear bookings')}
                      </button>
                    </div>
                    <ul className="account-bookings-list">
                      {bookingsList.map((b) => (
                        <li key={b.id} className="account-booking-item">
                          <div>
                            <strong>{b.reserve_name}</strong>
                            <div className="account-booking-cabin">{b.cabin_name}</div>
                            <div className="account-booking-dates">
                              {formatDate(b.start_date)} — {formatDate(b.end_date)}, {b.guests} {t('гостей', 'guests')}
                            </div>
                          </div>
                          <Link to={`/reserve/${b.reserve_id}`} className="btn btn-secondary btn-sm">
                            {t('К заповеднику', 'To reserve')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="account-card account-excursions-card">
                <h2>{t('Мои экскурсии', 'My excursions')}</h2>
                {loadingExcursions ? (
                  <p>{t('Загрузка...', 'Loading...')}</p>
                ) : excursionsList.length === 0 ? (
                  <p className="account-empty">
                    {t('Вы пока не записаны ни на одну экскурсию. Запишитесь на странице заповедника.', 'You have not signed up for any excursions yet. Sign up on a reserve page.')}
                  </p>
                ) : (
                  <ul className="account-excursions-list">
                    {excursionsList.map((e) => (
                      <li key={e.id} className="account-excursion-item">
                        <div className="account-excursion-info">
                          <strong>{e.title}</strong>
                          <div className="account-excursion-reserve">{e.reserve_name}</div>
                          <div className="account-excursion-meta">
                            <span>
                              <Icon name="calendar" size={13} /> {e.date}
                              &nbsp; <Icon name="time" size={13} /> {e.time}
                              {e.duration && <> &nbsp;· {e.duration}</>}
                            </span>
                            {e.guide && (
                              <span>
                                &nbsp;· <Icon name="guide" size={13} /> {e.guide}
                              </span>
                            )}
                          </div>
                          <div className="account-excursion-guests">
                            <Icon name="users" size={13} /> {t('Гостей', 'Guests')}: {e.guests}
                            {e.price > 0 && <> &nbsp;· {e.price * e.guests} BYN</>}
                          </div>
                        </div>
                        <Link to={`/reserve/${e.reserve_id}`} className="btn btn-secondary btn-sm">
                          {t('К заповеднику', 'To reserve')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="account-card account-notifications-card">
                <h2>{t('Уведомления', 'Notifications')}</h2>
                {loadingNotifications ? (
                  <p>{t('Загрузка...', 'Loading...')}</p>
                ) : notifications.length === 0 ? (
                  <p className="account-empty">
                    {t('Нет уведомлений', 'No notifications')}
                  </p>
                ) : (
                  <>
                    <div className="section-toolbar">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearNotifications}
                      >
                        {t('Очистить уведомления', 'Clear notifications')}
                      </button>
                    </div>
                    <ul className="account-notifications-list">
                      {notifications.map((notif) => (
                        <li
                          key={notif.id}
                          className={`account-notification-item ${notif.is_read ? 'read' : 'unread'}`}
                        >
                          <div className="notification-content">
                            <div className="notification-title">{notif.title}</div>
                            <div className="notification-message">{notif.message}</div>
                            <div className="notification-date">{formatDate(notif.created_at)}</div>
                          </div>
                          {!notif.is_read && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleMarkNotificationRead(notif.id)}
                            >
                              {t('Прочитано', 'Mark read')}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Account;
