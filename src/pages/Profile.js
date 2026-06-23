import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { useLanguage } from '../LanguageContext';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

const LOCAL_STORAGE_KEY = 'ecology_user';

const Profile = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    avatar: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState({ text: '', tone: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
        fetchProfile(userData.id);
      } catch {
        navigate('/account');
      }
    } else {
      navigate('/account');
    }
  }, [navigate]);

  const t = (ru, en) => (language === 'en' ? en : ru);

  const fetchProfile = async (userId) => {
    try {
      const res = await fetch(`${API}/api/users/${userId}/profile`);
      const data = await res.json();

      if (res.ok) {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          bio: data.bio || '',
          location: data.location || '',
          avatar: data.avatar || null
        });
        if (data.avatar) {
          setAvatarPreview(`${API}${data.avatar}`);
        } else {
          setAvatarPreview(null);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setToast({
          text: t('Файл слишком большой (макс. 5 МБ)', 'File too large (max 5 MB)'),
          tone: 'error',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setToast({
          text: t('Выберите изображение', 'Please select an image'),
          tone: 'error',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast({ text: '', tone: 'success' });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('bio', profile.bio || '');
      formData.append('location', profile.location || '');
      
      const avatarInput = document.getElementById('avatar-input');
      if (avatarInput && avatarInput.files[0]) {
        formData.append('avatar', avatarInput.files[0]);
      }

      const res = await fetch(`${API}/api/users/${user.id}/profile`, {
        method: 'PATCH',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setToast({
          text: t('Профиль успешно обновлен!', 'Profile updated successfully!'),
          tone: 'success',
        });
        
        // Обновляем данные пользователя в localStorage включая аватар
        const updatedUser = { ...user, name: data.name, avatar: data.avatar || user.avatar };
        setUser(updatedUser);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUser));
        
        // Принудительно перезагружаем профиль с сервера
        await fetchProfile(user.id);
        
        // Очищаем input файла после успешной загрузки
        if (avatarInput) {
          avatarInput.value = '';
        }
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => setToast({ text: '', tone: 'success' }), 3000);
      } else {
        setToast({
          text: data.error || t('Ошибка обновления профиля', 'Profile update error'),
          tone: 'error',
        });
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      setToast({
        text: t('Ошибка сети. Проверьте подключение к серверу.', 'Network error. Check server connection.'),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <Breadcrumb items={[
        { label: t('Главная', 'Home'), to: '/' },
        { label: t('Личный кабинет', 'Account'), to: '/account' },
        { label: t('Редактировать профиль', 'Edit profile') },
      ]} />
      <div className="container profile-container">
        <header className="profile-header">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="profile-back"
          >
            <span className="profile-back-icon" aria-hidden>←</span>
            {t('Назад к аккаунту', 'Back to account')}
          </button>
          <div className="profile-header-text">
            <h1 className="profile-title">{t('Редактировать профиль', 'Edit profile')}</h1>
            <p className="profile-lead">
              {t(
                'Фото, отображаемое имя и город. Email привязан к аккаунту.',
                'Photo, display name and city. Email is tied to your account.'
              )}
            </p>
          </div>
        </header>

        <div className="profile-card">
          <section className="profile-avatar-section" aria-label={t('Аватар', 'Avatar')}>
            <div className="avatar-display">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder" aria-hidden>
                  {getInitials(profile.name)}
                </div>
              )}
            </div>
            <div className="avatar-upload">
              <label htmlFor="avatar-input" className="btn btn-secondary profile-upload-btn">
                {t('Загрузить фото', 'Upload photo')}
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="profile-file-input"
              />
              <p className="avatar-hint">
                {t('JPG, PNG или GIF · до 5 МБ', 'JPG, PNG or GIF · up to 5 MB')}
              </p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">{t('Имя', 'Name')}</label>
              <input
                id="name"
                name="name"
                type="text"
                value={profile.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                disabled
                className="input-disabled"
                autoComplete="email"
              />
              <p className="field-hint">{t('Изменить email нельзя', 'Email cannot be changed')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="location">{t('Город / регион', 'City / region')}</label>
              <input
                id="location"
                name="location"
                type="text"
                value={profile.location}
                onChange={handleInputChange}
                placeholder={t('Например: Минск', 'e.g. Minsk')}
                autoComplete="address-level2"
              />
            </div>

            {toast.text && (
              <p
                className={`profile-message profile-message--${toast.tone}`}
                role="status"
              >
                {toast.text}
              </p>
            )}

            <button type="submit" className="btn btn-primary profile-submit" disabled={loading}>
              {loading ? t('Сохранение...', 'Saving...') : t('Сохранить', 'Save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
