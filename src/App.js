import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import ReservesMap from './components/ReservesMap';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ReserveDetail from './pages/ReserveDetail';
import ReserveBooking from './pages/ReserveBooking';
import ReserveExcursions from './pages/ReserveExcursions';
import Ecology from './pages/Ecology';
import Account from './pages/Account';
import Profile from './pages/Profile';
import ActivityDetail from './pages/ActivityDetail';
import Admin from './pages/Admin';
import ActivityTracker from './components/ActivityTracker';
import './App.css';
import './theme.css';

function ScrollToHash() {
  const location = useLocation();
  useEffect(() => {
    // При смене страницы без хэша — скроллим вверх
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const hash = location.hash.slice(1);
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [location.pathname, location.hash]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToHash />
        <ActivityTracker />
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <About />
                <Services />
                <ReservesMap />
              </>
            } />
            <Route path="/reserve/:id" element={<ReserveDetail />} />
            <Route path="/reserve/:id/booking" element={<ReserveBooking />} />
            <Route path="/reserve/:id/excursions" element={<ReserveExcursions />} />
            <Route path="/ecology" element={<Ecology />} />
            <Route path="/activity/:slug" element={<ActivityDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/account" element={<Account />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

