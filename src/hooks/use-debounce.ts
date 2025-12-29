import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Custom hook to debounce a value
 * @param value The value to debounce
 * @param delay Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const prevValueRef = useRef<T>(value);

  useEffect(() => {
    // For arrays, compare by JSON string to avoid unnecessary updates
    const valueStr = JSON.stringify(value);
    const prevValueStr = JSON.stringify(prevValueRef.current);
    
    if (valueStr === prevValueStr) {
      return; // Value hasn't actually changed
    }
    
    prevValueRef.current = value;
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to debounce a callback function
 * @param callback The function to debounce
 * @param delay Delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

