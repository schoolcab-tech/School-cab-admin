import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number string into a more readable format
 * @param phoneNumber The phone number string to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  
  // Check if the number is valid
  const match = cleaned.match(/^(\d{1,3})?(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    // Format as (XXX) XXX-XXXX for US/Canada numbers
    const intlCode = match[1] ? `+${match[1]} ` : '';
    return `${intlCode}(${match[2]}) ${match[3]}-${match[4]}`;
  }
  
  // Return original if format doesn't match expected patterns
  return phoneNumber;
}

/**
 * Formats a date string or Date object into a human-readable format
 * @param date The date to format (string, number, or Date object)
 * @param options Intl.DateTimeFormatOptions to customize the output format
 * @returns Formatted date string
 */
export function formatDate(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: 'INR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `₹${amount.toFixed(2)}`;
  }
}
