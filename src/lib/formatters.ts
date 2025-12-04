import React from 'react';

export function formatCurrency(amount: number, currencySymbol: string = '₦'): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return `${currencySymbol}0.00`;
  
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  
  return `${currencySymbol}${formatted}`;
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatText(text: string | null | undefined): React.ReactNode {
  if (text === null || text === undefined) return null;
  const safeText = typeof text === 'string' ? text : JSON.stringify(text);
  let formatted = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return React.createElement('span', { dangerouslySetInnerHTML: { __html: formatted } });
}

export function getCurrentDayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}
