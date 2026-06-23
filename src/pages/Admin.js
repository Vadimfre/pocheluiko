import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import { useLanguage } from '../LanguageContext';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

const ECO_ICONS = [
  { key: 'importance', label: 'Глобус' },
  { key: 'climate',    label: 'Термометр' },
  { key: 'biodiversity', label: 'Росток' },
  { key: 'pollution', label: 'Завод' },
  { key: 'resources', label: 'Дерево' },
  { key: 'protection', label: 'Щит' },
  { key: 'sustainable', label: 'Цикл' },
  { key: 'maps',       label: 'Карта' },
  { key: 'education',  label: 'Книга' },
  { key: 'environmental', label: 'Инфо' },
  { key: 'research',   label: 'Поиск' },
];

const LOCAL_STORAGE_KEY = 'ecology_user';

const Admin = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('feedback');

  // Feedback
  const [feedbackList, setFeedbackList] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [replyMsg, setReplyMsg] = useState({});

  // Reserves
  const [reserves, setReserves] = useState([]);
  const [editingReserve, setEditingReserve] = useState(null);
  const [reserveMsg, setReserveMsg] = useState('');

  // Users
  const [users, setUsers] = useState([]);

  // Excursions
  const [excursions, setExcursions] = useState([]);
  const [excForm, setExcForm] = useState({ reserve_id: 1, title: '', description: '', what_to_expect: '', route: '', guide: '', date: '', time: '', duration: '2 часа', max_participants: 20, price: 0, image: '' });
  const [excMsg, setExcMsg] = useState('');
  const [uploadingExcImage, setUploadingExcImage] = useState(false);

  // Cabins & Bookings
  const [cabins, setCabins] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingCabin, setEditingCabin] = useState(null);
  const [cabinForm, setCabinForm] = useState({ reserve_id: 1, name: '', description: '', amenities: '', details: '', capacity: 2, price_per_night: 0, source_url: '', image: '' });
  const [cabinMsg, setCabinMsg] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Ecology topics
  const [ecoTopics, setEcoTopics] = useState([]);
  const [editingEco, setEditingEco] = useState(null);
  const [ecoForm, setEcoForm] = useState({ id: '', icon: 'importance', title_ru: '', title_en: '', content_title_ru: '', content_title_en: '', paragraphs_ru: '', paragraphs_en: '' });
  const [ecoMsg, setEcoMsg] = useState('');

  const t = (ru, en) => language === 'en' ? en : ru;

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) { navigate('/account'); return; }
    try {
      const u = JSON.parse(stored);
      if (!u.is_admin) { navigate('/'); return; }
      setUser(u);
    } catch { navigate('/account'); }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFeedback();
    fetchReserves();
    fetchUsers();
    fetchExcursions();
    fetchCabins();
    fetchBookings();
    fetchEcoTopics();
  }, [user]);

  const fetchExcursions = async () => {
    const res = await fetch(`${API}/api/admin/excursions`);
    const data = await res.json();
    setExcursions(data);
  };

  const fetchCabins = async () => {
    const res = await fetch(`${API}/api/admin/cabins`);
    const data = await res.json();
    setCabins(data);
  };

  const fetchBookings = async () => {
    const res = await fetch(`${API}/api/admin/bookings`);
    const data = await res.json();
    setBookings(data);
  };

  const handleCreateCabin = async () => {
    const res = await fetch(`${API}/api/admin/cabins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cabinForm),
    });
    if (res.ok) {
      setCabinMsg(t('Домик добавлен', 'Cabin added'));
      setCabinForm({ reserve_id: reserves[0]?.id || 1, name: '', description: '', amenities: '', details: '', capacity: 2, price_per_night: 0, source_url: '', image: '' });
      setEditingCabin(null);
      fetchCabins();
      setTimeout(() => setCabinMsg(''), 3000);
    }
  };

  const handleSaveCabin = async () => {
    if (!editingCabin) return;
    const res = await fetch(`${API}/api/admin/cabins/${editingCabin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCabin),
    });
    if (res.ok) {
      setCabinMsg(t('Сохранено', 'Saved'));
      setEditingCabin(null);
      fetchCabins();
      setTimeout(() => setCabinMsg(''), 3000);
    }
  };

  const handleDeleteCabin = async (id) => {
    if (!window.confirm(t('Удалить домик?', 'Delete cabin?'))) return;
    await fetch(`${API}/api/admin/cabins/${id}`, { method: 'DELETE' });
    fetchCabins();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        if (editingCabin) {
          setEditingCabin(p => ({ ...p, image: data.url }));
        } else {
          setCabinForm(p => ({ ...p, image: data.url }));
        }
        setCabinMsg(t('Фото загружено', 'Photo uploaded'));
        setTimeout(() => setCabinMsg(''), 3000);
      }
    } catch (err) {
      setCabinMsg(t('Ошибка загрузки', 'Upload error'));
      setTimeout(() => setCabinMsg(''), 3000);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleExcImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingExcImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setExcForm(p => ({ ...p, image: data.url }));
        setExcMsg(t('Фото загружено', 'Photo uploaded'));
        setTimeout(() => setExcMsg(''), 3000);
      }
    } catch (err) {
      setExcMsg(t('Ошибка загрузки', 'Upload error'));
      setTimeout(() => setExcMsg(''), 3000);
    } finally {
      setUploadingExcImage(false);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm(t('Удалить бронирование?', 'Delete booking?'))) return;
    await fetch(`${API}/api/admin/bookings/${id}`, { method: 'DELETE' });
    fetchBookings();
  };

  const fetchEcoTopics = async () => {
    const res = await fetch(`${API}/api/ecology/topics`);
    const data = await res.json();
    setEcoTopics(data);
  };

  const handleSaveEco = async () => {
    const isNew = !editingEco;
    const payload = isNew ? {
      ...ecoForm,
      paragraphs_ru: ecoForm.paragraphs_ru.split('\n').filter(p => p.trim()),
      paragraphs_en: ecoForm.paragraphs_en.split('\n').filter(p => p.trim()),
    } : {
      ...editingEco,
      paragraphs_ru: editingEco.paragraphs_ru,
      paragraphs_en: editingEco.paragraphs_en,
    };

    const url = isNew
      ? `${API}/api/admin/ecology/topics`
      : `${API}/api/admin/ecology/topics/${editingEco.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEcoMsg(isNew ? t('Тема создана', 'Topic created') : t('Сохранено', 'Saved'));
      setEditingEco(null);
      setEcoForm({ id: '', icon: 'importance', title_ru: '', title_en: '', content_title_ru: '', content_title_en: '', paragraphs_ru: '', paragraphs_en: '' });
      fetchEcoTopics();
      setTimeout(() => setEcoMsg(''), 3000);
    }
  };

  const handleDeleteEco = async (id) => {
    if (!window.confirm(t('Удалить тему?', 'Delete topic?'))) return;
    await fetch(`${API}/api/admin/ecology/topics/${id}`, { method: 'DELETE' });
    fetchEcoTopics();
  };

  const handleCreateExcursion = async () => {
    const res = await fetch(`${API}/api/admin/excursions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(excForm),
    });
    if (res.ok) {
      setExcMsg(t('Экскурсия создана', 'Excursion created'));
      setExcForm({ reserve_id: reserves[0]?.id || 1, title: '', description: '', what_to_expect: '', route: '', guide: '', date: '', time: '', duration: '2 часа', max_participants: 20, price: 0, image: '' });
      fetchExcursions();
      setTimeout(() => setExcMsg(''), 3000);
    }
  };

  const handleDeleteExcursion = async (id) => {
    if (!window.confirm(t('Удалить экскурсию?', 'Delete excursion?'))) return;
    await fetch(`${API}/api/admin/excursions/${id}`, { method: 'DELETE' });
    fetchExcursions();
  };

  const fetchFeedback = async () => {
    const res = await fetch(`${API}/api/admin/feedback`);
    const data = await res.json();
    setFeedbackList(data);
  };

  const fetchReserves = async () => {
    const res = await fetch(`${API}/api/reserves`);
    const data = await res.json();
    setReserves(data);
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API}/api/admin/users`);
    const data = await res.json();
    setUsers(data);
  };

  const handleReply = async (id) => {
    const text = (replyText[id] || '').trim();
    if (!text) return;
    const res = await fetch(`${API}/api/admin/feedback/${id}/reply`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: text }),
    });
    if (res.ok) {
      setReplyMsg(prev => ({ ...prev, [id]: t('Ответ отправлен', 'Reply sent') }));
      setReplyText(prev => ({ ...prev, [id]: '' }));
      fetchFeedback();
      setTimeout(() => setReplyMsg(prev => ({ ...prev, [id]: '' })), 3000);
    }
  };

  const handleSaveReserve = async () => {
    if (!editingReserve) return;
    const res = await fetch(`${API}/api/admin/reserves/${editingReserve.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingReserve.name,
        description: editingReserve.description,
        features: editingReserve.features,
      }),
    });
    if (res.ok) {
      setReserveMsg(t('Сохранено', 'Saved'));
      fetchReserves();
      setTimeout(() => setReserveMsg(''), 3000);
    }
  };

  const formatDate = (str) => {
    if (!str) return '';
    try {
      return new Date(str).toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return str; }
  };

  if (!user) return null;

  return (
    <div className="admin-page">
      <Breadcrumb items={[
        { label: t('Главная', 'Home'), to: '/' },
        { label: t('Панель администратора', 'Admin Panel') },
      ]} />
      <div className="container">
        <div className="admin-header">
          <h1 className="admin-title">⚙️ {t('Панель администратора', 'Admin Panel')}</h1>
        </div>

        <div className="admin-tabs">
          {['feedback', 'reserves', 'cabins', 'ecology', 'excursions', 'users'].map(key => (
            <button
              key={key}
              className={`admin-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {key === 'feedback'   && t('Обращения', 'Feedback')}
              {key === 'reserves'   && t('Заповедники', 'Reserves')}
              {key === 'cabins'     && t('Домики', 'Cabins')}
              {key === 'ecology'    && t('Экология', 'Ecology')}
              {key === 'excursions' && t('Экскурсии', 'Excursions')}
              {key === 'users'      && t('Пользователи', 'Users')}
            </button>
          ))}
        </div>

        {/* ── FEEDBACK ── */}
        {tab === 'feedback' && (
          <div className="admin-section">
            <h2>{t('Обращения пользователей', 'User Feedback')} ({feedbackList.length})</h2>
            {feedbackList.length === 0 ? (
              <p className="admin-empty">{t('Обращений пока нет', 'No feedback yet')}</p>
            ) : (
              <div className="admin-feedback-list">
                {feedbackList.map(item => (
                  <div key={item.id} className={`admin-feedback-item ${item.reply ? 'replied' : 'pending'}`}>
                    <div className="admin-feedback-meta">
                      <span className="admin-feedback-author">
                        {item.user_name || item.name || t('Гость', 'Guest')}
                        {item.email && <span className="admin-feedback-email"> — {item.email}</span>}
                      </span>
                      <span className="admin-feedback-date">{formatDate(item.created_at)}</span>
                      <span className={`admin-feedback-status ${item.reply ? 'status-replied' : 'status-pending'}`}>
                        {item.reply ? t('Отвечено', 'Replied') : t('Ожидает ответа', 'Pending')}
                      </span>
                    </div>
                    <p className="admin-feedback-message">{item.message}</p>

                    {item.reply && (
                      <div className="admin-feedback-reply">
                        <span className="admin-reply-label">✉️ {t('Ваш ответ', 'Your reply')}:</span>
                        <p>{item.reply}</p>
                        <span className="admin-feedback-date">{formatDate(item.reply_at)}</span>
                      </div>
                    )}

                    <div className="admin-reply-form">
                      <textarea
                        className="admin-reply-input"
                        placeholder={item.reply
                          ? t('Изменить ответ...', 'Edit reply...')
                          : t('Написать ответ...', 'Write a reply...')}
                        value={replyText[item.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleReply(item.id)}
                        disabled={!(replyText[item.id] || '').trim()}
                      >
                        {item.reply ? t('Обновить ответ', 'Update reply') : t('Отправить ответ', 'Send reply')}
                      </button>
                      {replyMsg[item.id] && <span className="admin-success">{replyMsg[item.id]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESERVES ── */}
        {tab === 'reserves' && (
          <div className="admin-section">
            <h2>{t('Редактирование заповедников', 'Edit Reserves')}</h2>
            <div className="admin-reserves-layout">
              <div className="admin-reserves-list">
                {reserves.map(r => (
                  <button
                    key={r.id}
                    className={`admin-reserve-btn ${editingReserve?.id === r.id ? 'active' : ''}`}
                    onClick={() => { setEditingReserve({ ...r }); setReserveMsg(''); }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>

              {editingReserve && (
                <div className="admin-reserve-editor">
                  <div className="form-group">
                    <label>{t('Название', 'Name')}</label>
                    <input
                      type="text"
                      value={editingReserve.name}
                      onChange={e => setEditingReserve(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Описание', 'Description')}</label>
                    <textarea
                      rows={5}
                      value={editingReserve.description}
                      onChange={e => setEditingReserve(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Особенности (каждая с новой строки)', 'Features (one per line)')}</label>
                    <textarea
                      rows={6}
                      value={(editingReserve.features || []).join('\n')}
                      onChange={e => setEditingReserve(prev => ({
                        ...prev,
                        features: e.target.value.split('\n').filter(f => f.trim())
                      }))}
                    />
                  </div>
                  <div className="admin-editor-actions">
                    <button className="btn btn-primary" onClick={handleSaveReserve}>
                      {t('Сохранить', 'Save')}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditingReserve(null)}>
                      {t('Отмена', 'Cancel')}
                    </button>
                    {reserveMsg && <span className="admin-success">{reserveMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CABINS & BOOKINGS ── */}
        {tab === 'cabins' && (
          <div className="admin-section">
            <h2>{t('Домики и бронирования', 'Cabins & Bookings')}</h2>

            {/* Форма создания / редактирования домика */}
            <div className="admin-exc-form">
              <h3>{editingCabin ? t('Редактировать домик', 'Edit cabin') : t('Добавить домик', 'Add cabin')}</h3>
              <div className="admin-exc-fields">
                <select
                  value={editingCabin ? editingCabin.reserve_id : cabinForm.reserve_id}
                  onChange={e => editingCabin
                    ? setEditingCabin(p => ({ ...p, reserve_id: Number(e.target.value) }))
                    : setCabinForm(p => ({ ...p, reserve_id: Number(e.target.value) }))}
                >
                  {reserves.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input
                  placeholder={t('Название домика', 'Cabin name')}
                  value={editingCabin ? editingCabin.name : cabinForm.name}
                  onChange={e => editingCabin
                    ? setEditingCabin(p => ({ ...p, name: e.target.value }))
                    : setCabinForm(p => ({ ...p, name: e.target.value }))}
                />
                <input
                  type="number" min="1" placeholder={t('Вместимость', 'Capacity')}
                  value={editingCabin ? editingCabin.capacity : cabinForm.capacity}
                  onChange={e => editingCabin
                    ? setEditingCabin(p => ({ ...p, capacity: Number(e.target.value) }))
                    : setCabinForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                />
                <input
                  type="number" min="0" placeholder={t('Цена/ночь BYN', 'Price/night BYN')}
                  value={editingCabin ? editingCabin.price_per_night : cabinForm.price_per_night}
                  onChange={e => editingCabin
                    ? setEditingCabin(p => ({ ...p, price_per_night: Number(e.target.value) }))
                    : setCabinForm(p => ({ ...p, price_per_night: Number(e.target.value) }))}
                />
                <input
                  placeholder="URL источника"
                  value={editingCabin ? editingCabin.source_url || '' : cabinForm.source_url}
                  onChange={e => editingCabin
                    ? setEditingCabin(p => ({ ...p, source_url: e.target.value }))
                    : setCabinForm(p => ({ ...p, source_url: e.target.value }))}
                />
              </div>
              
              {/* Image Upload */}
              <div className="admin-image-upload">
                <label>{t('Фото домика', 'Cabin photo')}:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && <span className="admin-loading">{t('Загрузка...', 'Uploading...')}</span>}
                {(editingCabin?.image || cabinForm.image) && (
                  <div className="admin-image-preview">
                    <img src={editingCabin?.image || cabinForm.image} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              
              <textarea
                className="admin-exc-desc"
                placeholder={t('Описание', 'Description')}
                rows={3}
                value={editingCabin ? editingCabin.description || '' : cabinForm.description}
                onChange={e => editingCabin
                  ? setEditingCabin(p => ({ ...p, description: e.target.value }))
                  : setCabinForm(p => ({ ...p, description: e.target.value }))}
              />
              <textarea
                className="admin-exc-desc"
                placeholder={t('Удобства', 'Amenities')}
                rows={2}
                value={editingCabin ? editingCabin.amenities || '' : cabinForm.amenities}
                onChange={e => editingCabin
                  ? setEditingCabin(p => ({ ...p, amenities: e.target.value }))
                  : setCabinForm(p => ({ ...p, amenities: e.target.value }))}
              />
              <textarea
                className="admin-exc-desc"
                placeholder={t('Детали', 'Details')}
                rows={2}
                value={editingCabin ? editingCabin.details || '' : cabinForm.details}
                onChange={e => editingCabin
                  ? setEditingCabin(p => ({ ...p, details: e.target.value }))
                  : setCabinForm(p => ({ ...p, details: e.target.value }))}
              />
              <div className="admin-editor-actions">
                {editingCabin ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveCabin}>
                      {t('Сохранить', 'Save')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingCabin(null)}>
                      {t('Отмена', 'Cancel')}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleCreateCabin}
                    disabled={!cabinForm.name}>
                    {t('Добавить', 'Add')}
                  </button>
                )}
                {cabinMsg && <span className="admin-success">{cabinMsg}</span>}
              </div>
            </div>

            {/* Список домиков */}
            <div className="admin-exc-list" style={{ marginBottom: 32 }}>
              <h3>{t('Все домики', 'All cabins')} ({cabins.length})</h3>
              {cabins.length === 0 ? (
                <p className="admin-empty">{t('Домиков нет', 'No cabins')}</p>
              ) : cabins.map(c => (
                <div key={c.id} className={`admin-exc-item ${editingCabin?.id === c.id ? 'admin-item-editing' : ''}`}>
                  <div className="admin-exc-info">
                    <strong>{c.name}</strong>
                    <span className="admin-exc-reserve">{c.reserve_name}</span>
                    <span className="admin-exc-meta">
                      <Icon name="users" size={13} /> {t('Вместимость', 'Capacity')}: {c.capacity} · <Icon name="price" size={13} /> {c.price_per_night} BYN/{t('ночь', 'night')}
                    </span>
                    {c.description && <span className="admin-exc-meta">{c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => setEditingCabin({ ...c })}>
                      {t('Изменить', 'Edit')}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}
                      onClick={() => handleDeleteCabin(c.id)}>
                      {t('Удалить', 'Delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Бронирования */}
            <div className="admin-exc-list">
              <div className="admin-bookings-header">
                <h3>{t('Все бронирования', 'All bookings')} ({bookings.length})</h3>
                <input
                  className="admin-bookings-search"
                  placeholder={t('Поиск по имени или email...', 'Search by name or email...')}
                  value={bookingFilter}
                  onChange={e => setBookingFilter(e.target.value)}
                />
              </div>
              {bookings.length === 0 ? (
                <p className="admin-empty">{t('Бронирований нет', 'No bookings')}</p>
              ) : bookings
                  .filter(b => !bookingFilter || b.guest_name.toLowerCase().includes(bookingFilter.toLowerCase()) || b.guest_email.toLowerCase().includes(bookingFilter.toLowerCase()))
                  .map(b => (
                <div key={b.id} className="admin-booking-item">
                  <div className="admin-exc-info">
                    <strong>{b.guest_name}</strong>
                    <span className="admin-exc-meta">{b.guest_email}</span>
                    <span className="admin-exc-reserve">{b.reserve_name} · {b.cabin_name}</span>
                    <span className="admin-exc-meta">
                      📅 {b.start_date} → {b.end_date} · 👥 {b.guests} {t('гостей', 'guests')}
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}
                    onClick={() => handleDeleteBooking(b.id)}>
                    {t('Удалить', 'Delete')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ECOLOGY ── */}
        {tab === 'ecology' && (
          <div className="admin-section">
            <h2>{t('Темы экологии', 'Ecology Topics')}</h2>

            {/* Форма создания / редактирования */}
            <div className="admin-exc-form">
              <h3>{editingEco ? t('Редактировать тему', 'Edit topic') : t('Новая тема', 'New topic')}</h3>
              <div className="admin-exc-fields">
                {!editingEco && (
                  <input
                    placeholder={t('ID (латиницей, напр. forests)', 'ID (latin, e.g. forests)')}
                    value={ecoForm.id}
                    onChange={e => setEcoForm(p => ({ ...p, id: e.target.value.replace(/\s/g, '_') }))}
                  />
                )}
              </div>
              {/* Пикер иконки */}
              <div className="admin-eco-icon-picker">
                <label className="admin-eco-label">{t('Иконка', 'Icon')}</label>
                <div className="admin-eco-icon-grid">
                  {ECO_ICONS.map(ic => {
                    const current = editingEco ? editingEco.icon : ecoForm.icon;
                    return (
                      <button
                        key={ic.key}
                        type="button"
                        title={ic.label}
                        className={`admin-eco-icon-btn ${current === ic.key ? 'selected' : ''}`}
                        onClick={() => editingEco
                          ? setEditingEco(p => ({ ...p, icon: ic.key }))
                          : setEcoForm(p => ({ ...p, icon: ic.key }))}
                      >
                        <Icon name={ic.key} size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="admin-exc-fields" style={{ marginTop: 8 }}>
                <input
                  placeholder={t('Название (RU)', 'Title (RU)')}
                  value={editingEco ? editingEco.title_ru : ecoForm.title_ru}
                  onChange={e => editingEco
                    ? setEditingEco(p => ({ ...p, title_ru: e.target.value }))
                    : setEcoForm(p => ({ ...p, title_ru: e.target.value }))}
                />
                <input
                  placeholder={t('Название (EN)', 'Title (EN)')}
                  value={editingEco ? editingEco.title_en : ecoForm.title_en}
                  onChange={e => editingEco
                    ? setEditingEco(p => ({ ...p, title_en: e.target.value }))
                    : setEcoForm(p => ({ ...p, title_en: e.target.value }))}
                />
                <input
                  placeholder={t('Заголовок статьи (RU)', 'Article title (RU)')}
                  value={editingEco ? editingEco.content_title_ru : ecoForm.content_title_ru}
                  onChange={e => editingEco
                    ? setEditingEco(p => ({ ...p, content_title_ru: e.target.value }))
                    : setEcoForm(p => ({ ...p, content_title_ru: e.target.value }))}
                />
                <input
                  placeholder={t('Заголовок статьи (EN)', 'Article title (EN)')}
                  value={editingEco ? editingEco.content_title_en : ecoForm.content_title_en}
                  onChange={e => editingEco
                    ? setEditingEco(p => ({ ...p, content_title_en: e.target.value }))
                    : setEcoForm(p => ({ ...p, content_title_en: e.target.value }))}
                />
              </div>
              <div className="admin-eco-textareas">
                <div>
                  <label className="admin-eco-label">{t('Абзацы (RU) — каждый с новой строки', 'Paragraphs (RU) — one per line')}</label>
                  <textarea
                    className="admin-exc-desc admin-eco-textarea"
                    rows={6}
                    value={editingEco
                      ? (Array.isArray(editingEco.paragraphs_ru) ? editingEco.paragraphs_ru.join('\n') : editingEco.paragraphs_ru)
                      : ecoForm.paragraphs_ru}
                    onChange={e => editingEco
                      ? setEditingEco(p => ({ ...p, paragraphs_ru: e.target.value.split('\n') }))
                      : setEcoForm(p => ({ ...p, paragraphs_ru: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-eco-label">{t('Абзацы (EN) — каждый с новой строки', 'Paragraphs (EN) — one per line')}</label>
                  <textarea
                    className="admin-exc-desc admin-eco-textarea"
                    rows={6}
                    value={editingEco
                      ? (Array.isArray(editingEco.paragraphs_en) ? editingEco.paragraphs_en.join('\n') : editingEco.paragraphs_en)
                      : ecoForm.paragraphs_en}
                    onChange={e => editingEco
                      ? setEditingEco(p => ({ ...p, paragraphs_en: e.target.value.split('\n') }))
                      : setEcoForm(p => ({ ...p, paragraphs_en: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-editor-actions" style={{ marginTop: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveEco}
                  disabled={editingEco ? false : !ecoForm.id || !ecoForm.title_ru}>
                  {editingEco ? t('Сохранить', 'Save') : t('Создать', 'Create')}
                </button>
                {editingEco && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingEco(null)}>
                    {t('Отмена', 'Cancel')}
                  </button>
                )}
                {ecoMsg && <span className="admin-success">{ecoMsg}</span>}
              </div>
            </div>

            {/* Список тем */}
            <div className="admin-exc-list">
              <h3>{t('Все темы', 'All topics')} ({ecoTopics.length})</h3>
              {ecoTopics.map(topic => (
                <div key={topic.id} className={`admin-exc-item ${editingEco?.id === topic.id ? 'admin-item-editing' : ''}`}>
                  <div className="admin-exc-info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }}>
                      <Icon name={topic.icon} size={18} />
                    </span>
                    <div>
                      <strong>{topic.title_ru}</strong>
                      <span className="admin-exc-meta">{topic.title_en}</span>
                      <span className="admin-exc-meta">{topic.content_title_ru}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => setEditingEco({ ...topic })}>
                      {t('Изменить', 'Edit')}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }}
                      onClick={() => handleDeleteEco(topic.id)}>
                      {t('Удалить', 'Delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EXCURSIONS ── */}
        {tab === 'excursions' && (          <div className="admin-section">
            <h2>{t('Управление экскурсиями', 'Manage Excursions')}</h2>

            <div className="admin-exc-form">
              <h3>{t('Создать экскурсию', 'Create excursion')}</h3>
              <div className="admin-exc-fields">
                <select value={excForm.reserve_id} onChange={e => setExcForm(p => ({ ...p, reserve_id: Number(e.target.value) }))}>
                  {reserves.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input placeholder={t('Название', 'Title')} value={excForm.title} onChange={e => setExcForm(p => ({ ...p, title: e.target.value }))} />
                <input placeholder={t('Гид', 'Guide')} value={excForm.guide} onChange={e => setExcForm(p => ({ ...p, guide: e.target.value }))} />
                <input type="date" value={excForm.date} onChange={e => setExcForm(p => ({ ...p, date: e.target.value }))} />
                <input type="time" value={excForm.time} onChange={e => setExcForm(p => ({ ...p, time: e.target.value }))} />
                <input placeholder={t('Длительность', 'Duration')} value={excForm.duration} onChange={e => setExcForm(p => ({ ...p, duration: e.target.value }))} />
                <input type="number" placeholder={t('Макс. участников', 'Max participants')} value={excForm.max_participants} onChange={e => setExcForm(p => ({ ...p, max_participants: Number(e.target.value) }))} />
                <input type="number" placeholder={t('Цена BYN', 'Price BYN')} value={excForm.price} onChange={e => setExcForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
              
              {/* Image Upload */}
              <div className="admin-image-upload">
                <label>{t('Фото экскурсии', 'Excursion photo')}:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleExcImageUpload}
                  disabled={uploadingExcImage}
                />
                {uploadingExcImage && <span className="admin-loading">{t('Загрузка...', 'Uploading...')}</span>}
                {excForm.image && (
                  <div className="admin-image-preview">
                    <img src={excForm.image} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              
              <textarea className="admin-exc-desc" placeholder={t('Описание', 'Description')} value={excForm.description} onChange={e => setExcForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              <textarea className="admin-exc-desc" placeholder={t('Что вас ожидает', 'What to expect')} value={excForm.what_to_expect} onChange={e => setExcForm(p => ({ ...p, what_to_expect: e.target.value }))} rows={3} />
              <textarea className="admin-exc-desc" placeholder={t('Маршрут', 'Route')} value={excForm.route} onChange={e => setExcForm(p => ({ ...p, route: e.target.value }))} rows={3} />
              <div className="admin-editor-actions">
                <button className="btn btn-primary btn-sm" onClick={handleCreateExcursion} disabled={!excForm.title || !excForm.date || !excForm.time}>
                  {t('Создать', 'Create')}
                </button>
                {excMsg && <span className="admin-success">{excMsg}</span>}
              </div>
            </div>

            <div className="admin-exc-list">
              <h3>{t('Все экскурсии', 'All excursions')} ({excursions.length})</h3>
              {excursions.length === 0 ? (
                <p className="admin-empty">{t('Экскурсий пока нет', 'No excursions yet')}</p>
              ) : excursions.map(e => (
                <div key={e.id} className="admin-exc-item">
                  <div className="admin-exc-info">
                    <strong>{e.title}</strong>
                    <span className="admin-exc-reserve">{e.reserve_name}</span>
                    <span className="admin-exc-meta">
                      <Icon name="calendar" size={13} /> {e.date} &nbsp;
                      <Icon name="time" size={13} /> {e.time}
                      &nbsp;· {e.registered}/{e.max_participants} {t('чел.', 'ppl')}
                    </span>
                    {e.guide && (
                      <span className="admin-exc-meta">
                        <Icon name="guide" size={13} /> {e.guide}
                      </span>
                    )}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDeleteExcursion(e.id)}>
                    {t('Удалить', 'Delete')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (          <div className="admin-section">
            <h2>{t('Пользователи', 'Users')} ({users.length})</h2>
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>ID</span>
                <span>{t('Имя', 'Name')}</span>
                <span>Email</span>
                <span>{t('Роль', 'Role')}</span>
                <span>{t('Дата регистрации', 'Registered')}</span>
              </div>
              {users.map(u => (
                <div key={u.id} className="admin-users-row">
                  <span>#{u.id}</span>
                  <span>{u.name}</span>
                  <span>{u.email}</span>
                  <span className={u.is_admin ? 'role-admin' : 'role-user'}>
                    {u.is_admin ? 'Admin' : t('Пользователь', 'User')}
                  </span>
                  <span>{formatDate(u.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
