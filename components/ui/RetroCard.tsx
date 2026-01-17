'use client';

import { Card, CardProps } from 'pixel-retroui';
import React from 'react';

/**
 * RetroCard - Wrapper for pixel-retroui Card component
 * Provides consistent retro pixel styling across the app
 */
export const RetroCard: React.FC<CardProps> = (props) => {
  return <Card {...props} />;
};
