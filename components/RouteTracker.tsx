import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { startSession, endSession, trackPageView } from '../services/analyticsService';

export const RouteTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string>('');

  // Session lifecycle: start once per page-load JS session, never on SPA nav.
  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    startSession();
    const path = location.pathname + location.search;
    if (path !== lastPath.current) {
      lastPath.current = path;
      trackPageView(location.pathname || '/');
    }
  }, [location]);

  useEffect(() => {
    const onHide = () => endSession();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      endSession();
    };
  }, []);

  return null;
};