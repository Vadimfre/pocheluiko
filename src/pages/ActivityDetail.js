import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import ReservesMap from '../components/ReservesMap';
import Icon from '../components/Icon';
import './ActivityDetail.css';
import { useLanguage } from '../LanguageContext';
import Breadcrumb from '../components/Breadcrumb';

const ACTIVITY_CONTENT = {
  maps: {
    slug: 'maps',
    titleRu: 'Интерактивные карты',
    titleEn: 'Interactive maps',
    leadRu: 'Изучайте расположение заповедников на интерактивных картах с подробной информацией о каждом объекте.',
    leadEn: 'Explore the location of reserves on interactive maps with detailed information about each site.',
    sectionsRu: [
      {
        title: 'Возможности интерактивных карт',
        content: 'На нашем портале вы можете увидеть все заповедники и национальные парки Беларуси на одной карте. Карта помогает составить маршрут, сравнить расположение объектов и выбрать направление для поездки. Интерактивный интерфейс позволяет быстро находить нужную информацию и планировать посещение природных территорий.'
      },
      {
        title: 'Информация о заповедниках',
        content: 'Для каждого заповедника доступны: площадь территории, год основания, краткое описание и ссылка на страницу с полной информацией, животными и возможностью бронирования жилья. Вы можете узнать об уникальных особенностях каждой территории, её истории и значении для сохранения биоразнообразия.'
      },
      {
        title: 'Как использовать карты',
        content: 'Используйте карту на главной странице или перейдите к списку заповедников — выберите интересующий объект и откройте его карту с точными координатами. Карты адаптированы для всех устройств и работают без подключения к интернету после первой загрузки.'
      },
      {
        title: 'Планирование маршрутов',
        content: 'С помощью интерактивных карт вы можете планировать экологические маршруты, учитывая расстояния между заповедниками, доступность транспорта и сезонные особенности посещения. Это особенно полезно для организации образовательных экскурсий и семейных поездок на природу.'
      }
    ],
    sectionsEn: [
      {
        title: 'Interactive map features',
        content: 'On our portal you can see all reserves and national parks of Belarus on one map. The map helps you plan a route, compare locations and choose a destination for your trip. The interactive interface allows you to quickly find the information you need and plan visits to natural areas.'
      },
      {
        title: 'Reserve information',
        content: 'For each reserve we provide: area, year of establishment, short description and a link to the full page with wildlife information and accommodation booking. You can learn about the unique features of each territory, its history and importance for biodiversity conservation.'
      },
      {
        title: 'How to use the maps',
        content: 'Use the map on the home page or go to the list of reserves — select an object and open its page with exact coordinates. Maps are adapted for all devices and work offline after the first load.'
      },
      {
        title: 'Route planning',
        content: 'With interactive maps you can plan ecological routes, taking into account distances between reserves, transport accessibility and seasonal visiting features. This is especially useful for organizing educational excursions and family trips to nature.'
      }
    ],
    ctaRu: 'Открыть карту заповедников на главной',
    ctaEn: 'Open reserves map on home page',
    ctaTo: '/#reserves',
    embedMap: true,
  },
  education: {
    slug: 'education',
    titleRu: 'Образовательные материалы',
    titleEn: 'Educational materials',
    leadRu: 'Актуальная информация о флоре, фауне и экосистемах заповедников Беларуси.',
    leadEn: 'Up-to-date information about the flora, fauna and ecosystems of Belarusian reserves.',
    sectionsRu: [
      {
        title: 'Систематизированные знания о природе',
        content: 'Мы собираем и систематизируем материалы о природе заповедников: описание видов животных и растений, особенности ландшафтов и экосистем, сезонные явления и рекомендации для посещения. Наша база данных постоянно пополняется новой информацией от специалистов и исследователей.'
      },
      {
        title: 'Интеграция с информацией о заповедниках',
        content: 'Образовательный раздел дополняет страницы заповедников: на каждой странице вы найдёте список типичных и редких видов, описание домиков и условий для экотуризма. Это помогает посетителям лучше подготовиться к поездке и понять ценность охраняемых территорий.'
      },
      {
        title: 'Углублённое изучение экологии',
        content: 'Для углублённого изучения экологии перейдите в раздел «Экология» — там представлены темы: важность экологии, изменение климата, биоразнообразие, загрязнение среды, природные ресурсы, охрана природы и устойчивое развитие. Материалы подходят для школьников, студентов и всех интересующихся.'
      },
      {
        title: 'Практическое применение знаний',
        content: 'Образовательные материалы можно использовать для подготовки уроков, презентаций, научных работ и просто для расширения кругозора. Мы предоставляем достоверную информацию, основанную на научных исследованиях и данных мониторинга заповедных территорий.'
      }
    ],
    sectionsEn: [
      {
        title: 'Systematised knowledge about nature',
        content: 'We collect and organise materials about the nature of reserves: descriptions of animal and plant species, landscape and ecosystem features, seasonal events and visiting tips. Our database is constantly updated with new information from specialists and researchers.'
      },
      {
        title: 'Integration with reserve information',
        content: 'The education section complements the reserve pages: each reserve has a list of typical and rare species, cabin descriptions and ecotourism information. This helps visitors better prepare for their trip and understand the value of protected areas.'
      },
      {
        title: 'In-depth ecology study',
        content: 'For deeper study of ecology, go to the Ecology section — topics include importance of ecology, climate change, biodiversity, pollution, natural resources, nature conservation and sustainable development. Materials are suitable for schoolchildren, students and anyone interested.'
      },
      {
        title: 'Practical application of knowledge',
        content: 'Educational materials can be used to prepare lessons, presentations, research papers or simply to broaden your horizons. We provide reliable information based on scientific research and monitoring data from protected areas.'
      }
    ],
    ctaRu: 'Перейти в раздел «Экология»',
    ctaEn: 'Go to Ecology section',
    ctaTo: '/ecology',
    embedMap: false,
  },
  environmental: {
    slug: 'environmental',
    titleRu: 'Экологическое просвещение',
    titleEn: 'Environmental education',
    leadRu: 'Узнавайте о важности сохранения природы и экологических инициативах.',
    leadEn: 'Learn about the importance of nature conservation and environmental initiatives.',
    sectionsRu: [
      {
        title: 'Наша миссия в экопросвещении',
        content: 'Экологическое просвещение — одна из наших главных задач. Мы рассказываем о роли заповедников в сохранении биоразнообразия, о том, как каждый может снизить свой экологический след и поддерживать устойчивый образ жизни. Наша цель — сделать экологические знания доступными для всех.'
      },
      {
        title: 'Образовательный контент',
        content: 'На портале вы найдёте статьи и подборки по темам: изменение климата, охрана природы, рациональное использование ресурсов. Эти материалы помогают школам, вузам и всем интересующимся строить занятия и проекты. Мы регулярно обновляем контент, добавляя актуальные данные и примеры из практики.'
      },
      {
        title: 'Практические рекомендации',
        content: 'Мы предлагаем конкретные советы по снижению воздействия на окружающую среду: от раздельного сбора отходов до выбора экологичных товаров и услуг. Каждый человек может внести вклад в сохранение природы, начав с простых шагов в повседневной жизни.'
      },
      {
        title: 'Сотрудничество и партнёрство',
        content: 'Если у вас есть идеи по сотрудничеству, предложения по контенту или вопросы — напишите нам через страницу «Контакты». Мы открыты к диалогу с образовательными и общественными организациями, готовы поддерживать инициативы по экологическому просвещению и совместно развивать проекты.'
      }
    ],
    sectionsEn: [
      {
        title: 'Our mission in environmental education',
        content: 'Environmental education is one of our main goals. We explain the role of reserves in conserving biodiversity and how everyone can reduce their environmental footprint and support a sustainable lifestyle. Our goal is to make environmental knowledge accessible to all.'
      },
      {
        title: 'Educational content',
        content: 'On the portal you will find articles and materials on climate change, nature conservation and sustainable use of resources. These resources support schools, universities and anyone interested in building lessons and projects. We regularly update content with current data and practical examples.'
      },
      {
        title: 'Practical recommendations',
        content: 'We offer specific advice on reducing environmental impact: from waste separation to choosing eco-friendly products and services. Everyone can contribute to nature conservation by starting with simple steps in everyday life.'
      },
      {
        title: 'Cooperation and partnership',
        content: 'If you have ideas for cooperation, content suggestions or questions — contact us via the Contact page. We are open to dialogue with educational and community organisations, ready to support environmental education initiatives and jointly develop projects.'
      }
    ],
    ctaRu: 'Связаться с нами',
    ctaEn: 'Contact us',
    ctaTo: '/#contact',
    embedMap: false,
  },
  research: {
    slug: 'research',
    titleRu: 'Научные исследования',
    titleEn: 'Scientific research',
    leadRu: 'Результаты научных исследований и мониторинга состояния заповедников.',
    leadEn: 'Results of scientific research and monitoring of reserve conditions.',
    sectionsRu: [
      {
        title: 'Роль заповедников в науке',
        content: 'Заповедники Беларуси — площадки для долгосрочного мониторинга флоры и фауны, климата и экосистем. Данные используются научными учреждениями и помогают принимать решения по охране территорий. Многолетние наблюдения позволяют отслеживать изменения в природе и своевременно реагировать на угрозы.'
      },
      {
        title: 'Доступ к научной информации',
        content: 'На нашем портале мы публикуем обобщённую информацию о видах, встречающихся в заповедниках, и о состоянии экосистем. Детальные отчёты и наборы данных запрашивайте в администрациях заповедников или в научных отделах. Мы стремимся сделать научные знания понятными для широкой аудитории.'
      },
      {
        title: 'Беловежская пуща — жемчужина исследований',
        content: 'Особое место занимает Беловежская пуща — объект Всемирного наследия ЮНЕСКО с богатой историей исследований. Здесь проводятся уникальные работы по изучению древних лесов, популяций зубров и других редких видов. Рекомендуем ознакомиться с её страницей и другими заповедниками для понимания масштаба работ.'
      },
      {
        title: 'Направления исследований',
        content: 'Основные направления научной работы в заповедниках включают: изучение биоразнообразия, мониторинг редких и исчезающих видов, исследование влияния климатических изменений, оценку состояния экосистем и разработку методов их восстановления. Результаты исследований публикуются в научных журналах и используются для природоохранной деятельности.'
      }
    ],
    sectionsEn: [
      {
        title: 'Role of reserves in science',
        content: 'Belarusian reserves are platforms for long-term monitoring of flora and fauna, climate and ecosystems. The data are used by research institutions and support conservation decisions. Long-term observations allow tracking changes in nature and responding to threats in a timely manner.'
      },
      {
        title: 'Access to scientific information',
        content: 'On our portal we publish summarised information on species found in reserves and ecosystem status. For detailed reports and datasets, contact reserve administrations or research departments. We strive to make scientific knowledge understandable to a wide audience.'
      },
      {
        title: 'Belovezhskaya Pushcha — research gem',
        content: 'Belovezhskaya Pushcha holds a special place as a UNESCO World Heritage site with a rich research history. Unique work is carried out here on studying ancient forests, bison populations and other rare species. We recommend visiting its page and other reserves to understand the scope of work.'
      },
      {
        title: 'Research directions',
        content: 'Main research areas in reserves include: biodiversity studies, monitoring of rare and endangered species, climate change impact research, ecosystem health assessment and development of restoration methods. Research results are published in scientific journals and used for conservation activities.'
      }
    ],
    ctaRu: 'Заповедник «Беловежская пуща»',
    ctaEn: 'Belovezhskaya Pushcha reserve',
    ctaTo: '/reserve/1',
    embedMap: false,
  },
};

const ActivityDetail = () => {
  const { slug } = useParams();
  const { language } = useLanguage();

  const content = ACTIVITY_CONTENT[slug];
  if (!content) {
    return <Navigate to="/" replace />;
  }

  const isEn = language === 'en';
  const title = isEn ? content.titleEn : content.titleRu;
  const lead = isEn ? content.leadEn : content.leadRu;
  const sections = isEn ? content.sectionsEn : content.sectionsRu;
  const cta = isEn ? content.ctaEn : content.ctaRu;

  return (
    <div className="activity-page">
      <Breadcrumb items={[
        { label: isEn ? 'Home' : 'Главная', to: '/' },
        { label: title },
      ]} />

      <div className="activity-body">
        <div className="container activity-content">

          <div className="activity-page-header">
            <div className="activity-hero-icon">
              <Icon name={content.slug} size={28} />
            </div>
            <div className="activity-header-text">
              <h1 className="activity-title">{title}</h1>
              <p className="activity-lead">{lead}</p>
            </div>
          </div>

          <div className="activity-sections-grid">
            {sections.map((section, i) => (
              <div key={i} className="activity-section-card">
                <div className="activity-section-num">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="activity-section-heading">{section.title}</h3>
                <p>{section.content}</p>
              </div>
            ))}
          </div>

          <div className="activity-cta-block">
            <span className="activity-cta-text">
              {isEn ? 'Ready to explore?' : 'Готовы к изучению?'}
            </span>
            <Link to={content.ctaTo} className="activity-cta">
              {cta} →
            </Link>
          </div>
        </div>

        {content.embedMap && (
          <section className="activity-map-embed" id="reserves">
            <h2 className="activity-section-title">
              {isEn ? 'Reserves on the map' : 'Заповедники на карте'}
            </h2>
            <ReservesMap />
          </section>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;
