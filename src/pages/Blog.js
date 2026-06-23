import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import Breadcrumb from '../components/Breadcrumb';
import './Blog.css';

const NEWS = [
  {
    id: 1,
    category: { ru: 'Заповедники', en: 'Reserves' },
    date: '2026-03-28',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    title_ru: 'Беловежская пуща получила статус объекта ЮНЕСКО расширенной зоны',
    title_en: 'Belovezhskaya Pushcha Receives Extended UNESCO World Heritage Status',
    excerpt_ru: 'Международный комитет ЮНЕСКО принял решение о расширении охраняемой зоны Беловежской пущи, включив в неё дополнительные 15 000 гектаров старовозрастного леса. Это решение стало результатом многолетней работы белорусских экологов.',
    excerpt_en: 'The UNESCO World Heritage Committee voted to expand the protected zone of Belovezhskaya Pushcha by an additional 15,000 hectares of old-growth forest, the result of years of work by Belarusian ecologists.',
    body_ru: [
      'Беловежская пуща — один из последних и крупнейших остатков первобытного леса, который некогда простирался по всей Европе. Решение ЮНЕСКО о расширении охраняемой зоны стало важнейшим событием в истории белорусской экологии.',
      'В расширенную зону вошли участки с уникальными экосистемами: болота, пойменные луга и старовозрастные дубравы возрастом более 500 лет. Здесь обитают зубры, рыси, волки и более 250 видов птиц.',
      'Новый статус обязывает Беларусь усилить меры по охране территории и ограничить хозяйственную деятельность в буферной зоне. Планируется создание новых экологических троп и образовательных центров для туристов.',
    ],
    body_en: [
      'Belovezhskaya Pushcha is one of the last and largest remnants of the primeval forest that once stretched across Europe. The UNESCO decision to expand the protected zone is a landmark event in Belarusian environmental history.',
      'The expanded zone includes areas with unique ecosystems: bogs, floodplain meadows,