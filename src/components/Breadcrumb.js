import React from 'react';
import { Link } from 'react-router-dom';
import './Breadcrumb.css';

/**
 * Breadcrumb — единая навигационная полоска для всех страниц.
 * Props:
 *   items: [{ label, to }]  — массив крошек, последняя без ссылки
 */
const Breadcrumb = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <div className="breadcrumb-bar">
      <div className="container">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              {isLast || !item.to ? (
                <span className="breadcrumb-current">{item.label}</span>
              ) : (
                <Link to={item.to} className="breadcrumb-link">
                  {i === 0 ? `← ${item.label}` : item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Breadcrumb;
