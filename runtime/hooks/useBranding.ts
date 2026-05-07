"use client";

import { useContext } from 'react';
import { RuntimeContext } from '../context/RuntimeContext';

export function useBranding() {
  const { config } = useContext(RuntimeContext);
  if (!config) {
    throw new Error('Runtime config not loaded');
  }
  return config.branding;
}