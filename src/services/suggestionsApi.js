const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const suggestionsApi = {
  /**
   * Obtener sugerencias desde el backend
   * @param {string} query - Texto de búsqueda
   * @param {number} limit - Número máximo de resultados
   * @param {AbortSignal} signal - Signal para cancelar la petición
   * @returns {Promise<string[]>} - Array de sugerencias
   */
  async getSuggestions(query, limit = 5, signal) {
    const response = await fetch(
      `${API_BASE_URL}/agent/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  }
};
