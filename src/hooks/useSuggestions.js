import { useState, useEffect, useCallback, useRef } from 'react';
import { suggestionsApi } from '../services/suggestionsApi';

/**
 * Hook personalizado para manejar sugerencias de autocompletado
 *
 * @param {number} debounceMs - Tiempo de espera antes de hacer la petición (default: 300ms)
 * @param {number} minChars - Mínimo de caracteres para activar búsqueda (default: 3)
 * @returns {object} Estado y funciones para manejar sugerencias
 */
export const useSuggestions = (debounceMs = 300, minChars = 3) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  /**
   * Fetch sugerencias desde la API
   */
  const fetchSuggestions = useCallback(async (query) => {
    // Validar mínimo de caracteres
    if (query.trim().length < minChars) {
      setSuggestions([]);
      return;
    }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Llamar al servicio API
      const data = await suggestionsApi.getSuggestions(
        query,
        5,
        abortControllerRef.current.signal
      );

      setSuggestions(data);
    } catch (err) {
      // Ignorar errores de abort (son esperados)
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching suggestions:', err);
      setError(err.message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  const searchSuggestions = useCallback((query) => {

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length < minChars) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);
  }, [fetchSuggestions, debounceMs, minChars]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    searchSuggestions,
    clearSuggestions
  };
};
