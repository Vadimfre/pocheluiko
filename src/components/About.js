import React from 'react';
import './About.css';
import { useLanguage } from '../LanguageContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const About = () => {
  const { language } = useLanguage();
  const [titleRef, titleVisible] = useScrollAnimation();
  const [contentRef, contentVisible] = useScrollAnimation();
  const [statsRef, statsVisible] = useScrollAnimation();

  const content = language === 'en' ? {
    title: 'About the project',
    subtitle: 'An information resource dedicated to studying and preserving the natural heritage of Belarus.',
    mission: 'Our mission',
    mission1: 'The project "Ecology and the World" was created to popularize knowledge about reserves and protected natural areas of the Republic of Belarus. We strive to show the uniqueness and value of our country\'s natural heritage and to involve citizens and guests of the country in the cause of nature conservation.',
    mission2: 'Through interactive maps, detailed descriptions of each reserve, and materials on ecology, we help people better understand the importance of preserving nature and ecological balance for future generations.',
    values: 'Our values',
    value1: 'Respect for nature — we consider protected areas as a common heritage that must be preserved.',
    value2: 'Openness of knowledge — we collect and publish reliable, scientifically based information.',
    value3: 'Education — we help teachers, students and tourists to learn more about Belarusian nature.',
    goals: 'What we do',
    goal1: 'We tell about the main reserves and national parks of Belarus: history, area, flora and fauna.',
    goal2: 'We help plan visits: we provide information about booking houses, excursions and rules of conduct.',
    goal3: 'We publish materials on ecology and sustainable development so that everyone can contribute to the protection of the environment.',
    forWhom: 'For whom this resource',
    for1: 'Tourists and travelers planning a trip to nature.',
    for2: 'Schoolchildren and students studying the geography and ecology of Belarus.',
    for3: 'Teachers and educators looking for materials for lessons and extracurricular activities.',
    for4: 'Everyone who cares about nature and wants to learn more about protected areas.',
    statsReserves: 'Reserves',
    statsHectares: 'Hectares of protected areas',
    statsSpecies: 'Species of animals and plants',
  } : {
    title: 'О проекте',
    subtitle: 'Информационный ресурс, посвящённый изучению и сохранению природного наследия Беларуси.',
    mission: 'Наша миссия',
    mission1: 'Проект «Экология и мир» создан для популяризации знаний о заповедниках и особо охраняемых природных территориях Республики Беларусь. Мы стремимся показать уникальность и ценность природного наследия нашей страны и привлечь граждан и гостей страны к делу сохранения природы.',
    mission2: 'Через интерактивные карты, подробные описания каждого заповедника и материалы по экологии мы помогаем людям лучше понимать важность сохранения природы и экологического баланса для будущих поколений.',
    values: 'Наши ценности',
    value1: 'Уважение к природе — мы считаем особо охраняемые территории общим достоянием, которое нужно сохранять.',
    value2: 'Открытость знаний — мы собираем и публикуем достоверную, научно обоснованную информацию.',
    value3: 'Просвещение — мы помогаем педагогам, школьникам и туристам узнавать больше о природе Беларуси.',
    goals: 'Чем мы занимаемся',
    goal1: 'Рассказываем об основных заповедниках и национальных парках Беларуси: история, площадь, флора и фауна.',
    goal2: 'Помогаем спланировать посещение: даём информацию о бронировании домиков, экскурсиях и правилах поведения.',
    goal3: 'Публикуем материалы по экологии и устойчивому развитию, чтобы каждый мог внести вклад в охрану окружающей среды.',
    forWhom: 'Для кого этот ресурс',
    for1: 'Туристы и путешественники, планирующие поездку на природу.',
    for2: 'Школьники и студенты, изучающие географию и экологию Беларуси.',
    for3: 'Педагоги и воспитатели, ищущие материалы для уроков и внеурочных занятий.',
    for4: 'Все, кому не безразлична природа и кто хочет больше узнать об особо охраняемых территориях.',
    statsReserves: 'Заповедников',
    statsHectares: 'Гектаров охраняемых территорий',
    statsSpecies: 'Видов животных и растений',
  };

  return (
    <section id="about" className="about">
      <div className="container">
        <h2 
          ref={titleRef}
          className={`section-title animate-on-scroll ${titleVisible ? 'animated' : ''}`}
        >
          {content.title}
        </h2>
        <p className={`section-subtitle animate-on-scroll ${titleVisible ? 'animated' : ''}`}>
          {content.subtitle}
        </p>
        <div 
          ref={contentRef}
          className={`about-content animate-on-scroll ${contentVisible ? 'animated' : ''}`}
        >
          <div className="about-text">
            <h3 className="about-mission-title">{content.mission}</h3>
            <p>{content.mission1}</p>
            <p>{content.mission2}</p>

            <h4 className="about-subheading">{content.values}</h4>
            <ul className="about-list">
              <li>{content.value1}</li>
              <li>{content.value2}</li>
              <li>{content.value3}</li>
            </ul>

            <h4 className="about-subheading">{content.goals}</h4>
            <ul className="about-list">
              <li>{content.goal1}</li>
              <li>{content.goal2}</li>
              <li>{content.goal3}</li>
            </ul>

            <h4 className="about-subheading">{content.forWhom}</h4>
            <ul className="about-list">
              <li>{content.for1}</li>
              <li>{content.for2}</li>
              <li>{content.for3}</li>
              <li>{content.for4}</li>
            </ul>

            <div 
              ref={statsRef}
              className="about-stats"
            >
              <div className={`stat-item animate-on-scroll animate-delay-1 ${statsVisible ? 'animated' : ''}`}>
                <div className="stat-number">6+</div>
                <div className="stat-label">{content.statsReserves}</div>
              </div>
              <div className={`stat-item animate-on-scroll animate-delay-2 ${statsVisible ? 'animated' : ''}`}>
                <div className="stat-number">500000+</div>
                <div className="stat-label">{content.statsHectares}</div>
              </div>
              <div className={`stat-item animate-on-scroll animate-delay-3 ${statsVisible ? 'animated' : ''}`}>
                <div className="stat-number">1000+</div>
                <div className="stat-label">{content.statsSpecies}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
