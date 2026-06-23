import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../config';

const ActivityTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackActivity = async () => {
      const stored = localStorage.getItem('ecology_user');
      if (!stored) return;

      try {
        const user = JSON.parse(stored);
        const title = getPageTitle(location.pathname);
        
        if (title) {
          await fetch(`${API}/api/users/${user.id}/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_type: 'page_view',
              title: title,
              url: location.pathname
            })
          });
        }
      } catch (error) {
        // Игнорируем ошибки отслеживания
      }
    };

    trackActivity();
  }, [location.pathname]);

  return null;
};

const getPageTitle = (pathname) => {
  const routes = {
    '/': 'Главная страница',
    '/ecology': 'Экология',
    '/contact': 'Контакты',
    '/account': 'Личный кабинет'
  };

  // Для динамических маршрутов
  if (pathname.startsWith('/reserve/')) {
    if (pathname.includes('/booking')) {
      return 'Бронирование домика';
    }
    return 'Страница заповедника';
  }

  if (pathname.startsWith('/activity/')) {
    return 'Детали активности';
  }

  return routes[pathname] || null;
};

export default ActivityTracker;
