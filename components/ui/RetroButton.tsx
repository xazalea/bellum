'use client';

import { Button, ButtonProps } from 'pixel-retroui';
import React from 'react';

/**
 * RetroButton - Wrapper for pixel-retroui Button component
 * Provides consistent retro pixel styling across the app
 */
export const RetroButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
