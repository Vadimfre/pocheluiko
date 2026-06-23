import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Contact.css';
import { useLanguage } from '../LanguageContext';
import Icon from './Icon';
import Breadcrumb from './Breadcrumb';
import API from '../config';

const Contact = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const isPage = location.pathname === '/contact';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const stored = localStorage.getItem('ecology_user');
    let userId = null;
    if (stored) {
      try {
        const user = JSON.parse(stored);
        userId = user.id;
      } catch {
        userId = null;
      }
    }

    fetch(`${API}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        name: formData.name,
        email: formData.email,
        message: formData.message,
      }),
    })
      .then(() => {
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <section id="contact" className="contact">
      {isPage && (
        <Breadcrumb items={[
          { label: language === 'en' ? 'Home' : 'Главная', to: '/' },
          { label: language === 'en' ? 'Contact' : 'Контакты' },
        ]} />
      )}
      <div className="container">
        <div className="contact-header">
          <h2 className="section-title contact-title-tight">
            {language === 'en' ? 'Contact us' : 'Свяжитесь с нами'}
          </h2>
          <p className="section-subtitle contact-lead">
            {language === 'en'
              ? 'Questions, ideas, or partnership — we reply within one business day.'
              : 'Вопросы, идеи или сотрудничество — ответим в течение рабочего дня.'}
          </p>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <div>
              <div className="contact-info-title">
                {language === 'en' ? 'Get in touch' : 'Связаться с нами'}
              </div>
              <div className="contact-info-highlight">
                {language === 'en'
                  ? 'We are open to dialogue about nature and projects.'
                  : 'Мы открыты к диалогу о природе и совместных проектах.'}
              </div>
            </div>
            <div className="info-items-grid">
              <div className="info-item">
                <div className="info-icon"><Icon name="mail" size={20} /></div>
                <div>
                  <h4>Email</h4>
                  <p>info@ecology-world.by</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><Icon name="phone" size={20} /></div>
                <div>
                  <h4>{language === 'en' ? 'Phone' : 'Телефон'}</h4>
                  <p>+375 (17) 123-45-67</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><Icon name="clock" size={20} /></div>
                <div>
                  <h4>{language === 'en' ? 'Working hours' : 'Время работы'}</h4>
                  <p>
                    {language === 'en'
                      ? 'Mon–Fri, 9:00–18:00'
                      : 'Пн–Пт, 9:00–18:00'}
                  </p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><Icon name="location" size={20} /></div>
                <div>
                  <h4>{language === 'en' ? 'Address' : 'Адрес'}</h4>
                  <p>
                    {language === 'en'
                      ? 'Minsk, Ekologicheskaya st., 1'
                      : 'г. Минск, ул. Экологическая, 1'}
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ */}
            <div className="contact-faq">
              <div className="contact-faq-title">
                {language === 'en' ? 'Frequently asked' : 'Частые вопросы'}
              </div>
              <div className="contact-faq-list">
                {(language === 'en' ? [
                  { q: 'How quickly do you respond?', a: 'We reply within one business day.' },
                  { q: 'Can I visit a reserve without booking?', a: 'Some areas require prior booking. Contact us to clarify.' },
                  { q: 'Do you offer group tours?', a: 'Yes, we organise group excursions for schools and companies.' },
                ] : [
                  { q: 'Как быстро вы отвечаете?', a: 'Мы отвечаем в течение одного рабочего дня.' },
                  { q: 'Можно посетить заповедник без брони?', a: 'Некоторые территории требуют предварительной записи. Уточните у нас.' },
                  { q: 'Есть ли групповые экскурсии?', a: 'Да, мы организуем групповые экскурсии для школ и компаний.' },
                ]).map((item, i) => (
                  <div key={i} className="contact-faq-item">
                    <p className="contact-faq-q">{item.q}</p>
                    <p className="contact-faq-a">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-title">
              {language === 'en'
                ? 'Write to us'
                : 'Напишите нам'}
            </div>
            <p className="contact-form-subtitle">
              {language === 'en'
                ? 'Fill in a few fields — we will get back to you as soon as possible.'
                : 'Заполните несколько полей — мы ответим вам в самое ближайшее время.'}
            </p>
            <div className="form-group">
              <label htmlFor="name">
                {language === 'en' ? 'Name' : 'Имя'}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">
                {language === 'en' ? 'Message' : 'Сообщение'}
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="6"
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              {submitting
                ? language === 'en'
                  ? 'Sending...'
                  : 'Отправка...'
                : language === 'en'
                  ? 'Send message'
                  : 'Отправить сообщение'}
            </button>
            {submitted && (
              <div className="form-success">
                {language === 'en'
                  ? 'Thank you! Your message has been sent.'
                  : 'Спасибо! Ваше сообщение отправлено.'}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;

