import React from 'react';
import './AvatarDisplay.css';
import API from '../config';


const AvatarDisplay = ({ user, size = 'medium' }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const sizeClass = `avatar-${size}`;

  return (
    <div className={`avatar-display ${sizeClass}`}>
      {user?.avatar ? (
        <img 
          src={`${API}${user.avatar}`} 
          alt={user.name} 
          className="avatar-img"
        />
      ) : (
        <div className="avatar-placeholder">
          {getInitials(user?.name || '')}
        </div>
      )}
    </div>
  );
};

export default AvatarDisplay;
