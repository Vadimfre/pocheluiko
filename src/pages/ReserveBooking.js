import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ReserveBooking.css';
import { useLanguage } from '../LanguageContext';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import API from '../config';

const ReserveBooking = () => {
  const { id } = useParams();
  const [reserve, setReserve] = useState(null);
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCabin, setSelectedCabin] = useState(null);
  const [selectedCabinData, setSelectedCabinData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    start_date: '',
    end_date: '',
    guests: 1,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { language } = useLanguage();

  useEffect(() => {
    const stored = localStorage.getItem('ecology_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reserveRes, cabinsRes] = await Promise.all([
          axios.get(`${API}/api/reserves/${id}`),
          axios.get(`${API}/api/reserves/${id}/cabins`),
        ]);
        setReserve(reserveRes.data);
        setCabins(cabinsRes.data);
        if (cabinsRes.data.length > 0) {
          setSelectedCabin(cabinsRes.data[0].name);
          setSelectedCabinData(cabinsRes.data[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Ошибка загрузки данных для бронирования:', error);
        setErrorMessage(
          language === 'en'
            ? 'Failed to load booking data.'
            : 'Не удалось загрузить данные для бронирования.'
        );
        setLoading(false);
      }
    };

    loadData();
  }, [id, language]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'guests' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedCabin) {
      setErrorMessage(
        language === 'en'
          ? 'Please select a cabin for booking.'
          : 'Пожалуйста, выберите домик для бронирования.'
      );
      return;
    }

    // Валидация дат
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (start < today) {
      setErrorMessage(
        language === 'en'
          ? 'Check-in date cannot be in the past.'
          : 'Дата заезда не может быть в прошлом.'
      );
      return;
    }
    if (end <= start) {
      setErrorMessage(
        language === 'en'
          ? 'Check-out date must be after check-in date.'
          : 'Дата выезда должна быть позже даты заезда.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/reserves/${id}/bookings`, {
        cabin_name: selectedCabin,
        ...formData,
      });
      setSuccessMessage(
        language === 'en'
          ? 'Booking has been successfully completed! We will contact you by the specified email.'
          : 'Бронирование успешно оформлено! Мы свяжемся с вами по указанной почте.'
      );
      setFormData({
        guest_name: '',
        guest_email: '',
        start_date: '',
        end_date: '',
        guests: 1,
      });
    } catch (error) {
      console.error('Ошибка при оформлении бронирования:', error);
      setErrorMessage(
        language === 'en'
          ? 'An error occurred while processing the booking. Please try again.'
          : 'Произошла ошибка при оформлении бронирования. Попробуйте ещё раз.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="reserve-booking-page">
        <div className="loading-container">
          <div className="loading">
            {language === 'en'
              ? 'Loading the booking page...'
              : 'Загрузка страницы бронирования...'}
          </div>
        </div>
      </div>
    );
  }

  if (!reserve) {
    return (
      <div className="reserve-booking-page">
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
    <div className="reserve-booking-page">
      <Breadcrumb items={[
        { label: language === 'en' ? 'Home' : 'Главная', to: '/' },
        { label: language === 'en' ? (reserve.name_en || reserve.name) : reserve.name, to: `/reserve/${id}` },
        { label: language === 'en' ? 'Cabin booking' : 'Бронирование домиков' },
      ]} />
      <div className="reserve-booking-hero">
        <div
          className="reserve-booking-hero-image"
          style={{
            backgroundImage: `url(${reserve.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="reserve-booking-hero-overlay"></div>
          <div className="container">
            <div className="reserve-booking-hero-content">
              <Link to={`/reserve/${id}`} className="back-button">
                ← {language === 'en' ? 'Back to the reserve' : 'Назад к заповеднику'}
              </Link>
              <h1>
                {language === 'en' ? 'Cabin booking' : 'Бронирование домиков'}
              </h1>
              <p className="reserve-booking-subtitle">
                {language === 'en' ? 'Reserve' : 'Заповедник'}: {language === 'en' ? (reserve.name_en || reserve.name) : reserve.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="reserve-booking-content">
        <div className="container">
          <div className="reserve-booking-layout">
            <div className="booking-cabins">
              <h2>
                {language === 'en' ? 'Available cabins' : 'Доступные домики'}
              </h2>
              {cabins.length === 0 ? (
                <p>
                  {language === 'en'
                    ? 'There are currently no cabins available for online booking in this reserve.'
                    : 'Для этого заповедника пока нет доступных домиков для онлайн-бронирования.'}
                </p>
              ) : (
                <div className="cabins-list">
                  {cabins.map((cabin) => (
                    <button
                      key={cabin.id}
                      type="button"
                      className={`cabin-card ${selectedCabin === cabin.name ? 'selected' : ''}`}
                      onClick={() => { setSelectedCabin(cabin.name); setSelectedCabinData(cabin); }}
                    >
                      <h3>{language === 'en' ? (cabin.name_en || cabin.name) : cabin.name}</h3>
                      <p className="cabin-description">{language === 'en' ? (cabin.description_en || cabin.description) : cabin.description}</p>
                      <div className="cabin-info">
                        <span>
                          {language === 'en'
                            ? `Capacity: ${cabin.capacity} people`
                            : `Вместимость: ${cabin.capacity} чел.`}
                        </span>
                        <span>
                          {language === 'en'
                            ? `from ${cabin.price_per_night} BYN/night`
                            : `от ${cabin.price_per_night} BYN/ночь`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="booking-form-wrapper">
              <h2>
                {language === 'en' ? 'Make a booking' : 'Оформить бронирование'}
              </h2>

              {/* Cabin details */}
              {selectedCabinData && (
                <div className="cabin-details">
                  {selectedCabinData.image && (
                    <div className="cabin-image">
                      <img src={selectedCabinData.image} alt={language === 'en' ? (selectedCabinData.name_en || selectedCabinData.name) : selectedCabinData.name} />
                    </div>
                  )}
                  <h3>{language === 'en' ? (selectedCabinData.name_en || selectedCabinData.name) : selectedCabinData.name}</h3>
                  {selectedCabinData.description && (
                    <div className="cabin-detail-section">
                      <h4>{language === 'en' ? 'Description' : 'Описание'}</h4>
                      <p>{language === 'en' ? (selectedCabinData.description_en || selectedCabinData.description) : selectedCabinData.description}</p>
                    </div>
                  )}
                  {selectedCabinData.amenities && (
                    <div className="cabin-detail-section">
                      <h4>{language === 'en' ? 'Amenities' : 'Удобства'}</h4>
                      <p>{language === 'en' ? (selectedCabinData.amenities_en || selectedCabinData.amenities) : selectedCabinData.amenities}</p>
                    </div>
                  )}
                  <div className="cabin-detail-section">
                    <h4>{language === 'en' ? 'Details' : 'Детали'}</h4>
                    <p>
                      {language === 'en'
                        ? `Capacity: ${selectedCabinData.capacity} people`
                        : `Вместимость: ${selectedCabinData.capacity} чел.`}
                      {' • '}
                      {language === 'en'
                        ? `Price: ${selectedCabinData.price_per_night} BYN/night`
                        : `Цена: ${selectedCabinData.price_per_night} BYN/ночь`}
                    </p>
                  </div>
                </div>
              )}

              {!currentUser ? (
                <div className="auth-required-block">
                  <div className="auth-required-icon">
                    <Icon name="lock" size={40} />
                  </div>
                  <p className="auth-required-text">
                    {language === 'en'
                      ? 'Please log in or register to make a booking.'
                      : 'Для оформления бронирования необходимо войти или зарегистрироваться.'}
                  </p>
                  <Link to="/account" className="btn btn-primary">
                    {language === 'en' ? 'Log in / Register' : 'Войти / Зарегистрироваться'}
                  </Link>
                </div>
              ) : (
              <>
              <p className="booking-note">
                {language === 'en'
                  ? 'Fill in the form below and the reserve staff will contact you to confirm your booking.'
                  : 'Заполните форму ниже, и сотрудники заповедника свяжутся с вами для подтверждения бронирования.'}
              </p>

              {errorMessage && <div className="booking-alert error">{errorMessage}</div>}
              {successMessage && <div className="booking-alert success">{successMessage}</div>}

              <form className="booking-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="guest_name">
                    {language === 'en' ? 'Your name' : 'Ваше имя'}
                  </label>
                  <input
                    id="guest_name"
                    name="guest_name"
                    type="text"
                    value={formData.guest_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="guest_email">
                    {language === 'en' ? 'Email address' : 'Электронная почта'}
                  </label>
                  <input
                    id="guest_email"
                    name="guest_email"
                    type="email"
                    value={formData.guest_email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="start_date">
                      {language === 'en' ? 'Check-in date' : 'Дата заезда'}
                    </label>
                    <input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end_date">
                      {language === 'en' ? 'Check-out date' : 'Дата выезда'}
                    </label>
                    <input
                      id="end_date"
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleChange}
                      min={formData.start_date || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="guests">
                    {language === 'en' ? 'Number of guests' : 'Количество гостей'}
                  </label>
                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.guests}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary booking-submit"
                  disabled={submitting || cabins.length === 0}
                >
                  {submitting
                    ? language === 'en'
                      ? 'Sending...'
                      : 'Отправка...'
                    : language === 'en'
                      ? 'Submit booking request'
                      : 'Отправить заявку на бронирование'}
                </button>
              </form>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveBooking;

