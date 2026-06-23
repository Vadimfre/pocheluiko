import React, { useState } from 'react';
import './CarbonCalculator.css';
import { useLanguage } from '../LanguageContext';

const CarbonCalculator = () => {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    electricity: 0,
    gas: 0,
    car: 0,
    flights: 0,
    meat: 3
  });
  const [result, setResult] = useState(null);

  const t = (ru, en) => (language === 'en' ? en : ru);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const calculateCarbon = (e) => {
    e.preventDefault();
    
    // Коэффициенты выбросов CO2 (кг CO2 в год)
    const electricityFactor = 0.5; // кг CO2 на кВт·ч
    const gasFactor = 2.0; // кг CO2 на м³
    const carFactor = 2.3; // кг CO2 на км
    const flightFactor = 90; // кг CO2 на час полета
    const meatFactor = 730; // кг CO2 на порцию в неделю в год
    
    const total = 
      (formData.electricity * 12 * electricityFactor) +
      (formData.gas * 12 * gasFactor) +
      (formData.car * 365 * carFactor) +
      (formData.flights * flightFactor) +
      (formData.meat * meatFactor);
    
    setResult({
      total: total.toFixed(0),
      trees: (total / 21).toFixed(0), // Одно дерево поглощает ~21 кг CO2 в год
      comparison: total > 10000 ? 'high' : total > 5000 ? 'medium' : 'low'
    });
  };

  return (
    <div className="carbon-calculator">
      <h3>{t('Калькулятор углеродного следа', 'Carbon Footprint Calculator')}</h3>
      <p className="calculator-description">
        {t(
          'Рассчитайте свой годовой углеродный след и узнайте, как его уменьшить',
          'Calculate your annual carbon footprint and learn how to reduce it'
        )}
      </p>
      
      <form onSubmit={calculateCarbon} className="calculator-form">
        <div className="form-group">
          <label>
            ⚡ {t('Электричество (кВт·ч в месяц)', 'Electricity (kWh per month)')}
          </label>
          <input
            type="number"
            name="electricity"
            value={formData.electricity}
            onChange={handleChange}
            min="0"
            step="10"
          />
        </div>

        <div className="form-group">
          <label>
            🔥 {t('Газ (м³ в месяц)', 'Gas (m³ per month)')}
          </label>
          <input
            type="number"
            name="gas"
            value={formData.gas}
            onChange={handleChange}
            min="0"
            step="5"
          />
        </div>

        <div className="form-group">
          <label>
            🚗 {t('Автомобиль (км в день)', 'Car (km per day)')}
          </label>
          <input
            type="number"
            name="car"
            value={formData.car}
            onChange={handleChange}
            min="0"
            step="5"
          />
        </div>

        <div className="form-group">
          <label>
            ✈️ {t('Авиаперелеты (часов в год)', 'Flights (hours per year)')}
          </label>
          <input
            type="number"
            name="flights"
            value={formData.flights}
            onChange={handleChange}
            min="0"
            step="1"
          />
        </div>

        <div className="form-group">
          <label>
            🥩 {t('Мясо (порций в неделю)', 'Meat (servings per week)')}
          </label>
          <input
            type="number"
            name="meat"
            value={formData.meat}
            onChange={handleChange}
            min="0"
            max="21"
            step="1"
          />
        </div>

        <button type="submit" className="btn btn-primary">
          {t('Рассчитать', 'Calculate')}
        </button>
      </form>

      {result && (
        <div className={`calculator-result ${result.comparison}`}>
          <h4>{t('Ваш углеродный след:', 'Your carbon footprint:')}</h4>
          <div className="result-value">
            <span className="result-number">{result.total}</span>
            <span className="result-unit">{t('кг CO₂/год', 'kg CO₂/year')}</span>
          </div>
          <p className="result-trees">
            {t(
              `Для компенсации нужно посадить ${result.trees} деревьев`,
              `You need to plant ${result.trees} trees to offset this`
            )}
          </p>
          <div className="result-tips">
            <h5>{t('Как уменьшить след:', 'How to reduce:')}</h5>
            <ul>
              <li>{t('Используйте общественный транспорт', 'Use public transport')}</li>
              <li>{t('Экономьте электроэнергию', 'Save electricity')}</li>
              <li>{t('Сократите потребление мяса', 'Reduce meat consumption')}</li>
              <li>{t('Выбирайте местные продукты', 'Choose local products')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarbonCalculator;
