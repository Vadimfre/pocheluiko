import React, { useState } from 'react';
import './EcoQuiz.css';
import { useLanguage } from '../LanguageContext';

const EcoQuiz = () => {
  const { language } = useLanguage();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const t = (ru, en) => (language === 'en' ? en : ru);

  const questions = language === 'en' ? [
    {
      question: 'How much of the Earth\'s surface is covered by water?',
      options: ['50%', '71%', '85%', '60%'],
      correct: 1
    },
    {
      question: 'Which gas is the main cause of global warming?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
      correct: 2
    },
    {
      question: 'How long does a plastic bottle decompose in nature?',
      options: ['10 years', '50 years', '100 years', '450 years'],
      correct: 3
    },
    {
      question: 'Which energy source is renewable?',
      options: ['Coal', 'Oil', 'Solar', 'Natural gas'],
      correct: 2
    },
    {
      question: 'What percentage of oxygen is produced by the oceans?',
      options: ['20%', '50%', '70%', '90%'],
      correct: 1
    }
  ] : [
    {
      question: 'Какая часть поверхности Земли покрыта водой?',
      options: ['50%', '71%', '85%', '60%'],
      correct: 1
    },
    {
      question: 'Какой газ является основной причиной глобального потепления?',
      options: ['Кислород', 'Азот', 'Углекислый газ', 'Водород'],
      correct: 2
    },
    {
      question: 'Сколько лет разлагается пластиковая бутылка в природе?',
      options: ['10 лет', '50 лет', '100 лет', '450 лет'],
      correct: 3
    },
    {
      question: 'Какой источник энергии является возобновляемым?',
      options: ['Уголь', 'Нефть', 'Солнечная энергия', 'Природный газ'],
      correct: 2
    },
    {
      question: 'Какой процент кислорода производят океаны?',
      options: ['20%', '50%', '70%', '90%'],
      correct: 1
    }
  ];

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    
    setTimeout(() => {
      if (index === questions[currentQuestion].correct) {
        setScore(score + 1);
      }
      
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResult(true);
      }
    }, 1000);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
  };

  const getResultMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) {
      return t('Отлично! Вы эксперт в экологии! 🌟', 'Excellent! You are an ecology expert! 🌟');
    } else if (percentage >= 60) {
      return t('Хорошо! Продолжайте изучать экологию! 👍', 'Good! Keep learning about ecology! 👍');
    } else {
      return t('Есть куда расти! Изучайте больше об экологии! 📚', 'Room for improvement! Learn more about ecology! 📚');
    }
  };

  return (
    <div className="eco-quiz">
      <h3>{t('Экологическая викторина', 'Ecology Quiz')}</h3>
      
      {!showResult ? (
        <div className="quiz-content">
          <div className="quiz-progress">
            <span>{t('Вопрос', 'Question')} {currentQuestion + 1} / {questions.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="quiz-question">
            <h4>{questions[currentQuestion].question}</h4>
          </div>

          <div className="quiz-options">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className={`quiz-option ${
                  selectedAnswer === index
                    ? index === questions[currentQuestion].correct
                      ? 'correct'
                      : 'incorrect'
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="quiz-result">
          <h4>{t('Результат', 'Result')}</h4>
          <div className="result-score">
            <span className="score-number">{score}</span>
            <span className="score-total">/ {questions.length}</span>
          </div>
          <p className="result-message">{getResultMessage()}</p>
          <button className="btn btn-primary" onClick={restartQuiz}>
            {t('Пройти снова', 'Try again')}
          </button>
        </div>
      )}
    </div>
  );
};

export default EcoQuiz;
