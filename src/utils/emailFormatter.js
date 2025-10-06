/**
 * Utilidades para formatear contenido de correos electrónicos
 * Convierte el texto plano de emails en HTML estructurado y legible
 */

/**
 * Formatea el contenido de un correo para mejor visualización
 * @param {string} emailBody - Contenido del correo en texto plano
 * @returns {string} - HTML formateado
 */
export function formatEmailContent(emailBody) {
  if (!emailBody) return '';

  let formatted = emailBody;

  // 1. Limpiar múltiples líneas vacías
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // 2. Parsear secciones citadas (>)
  formatted = parseQuotedSections(formatted);

  // 3. Detectar y formatear firmas
  formatted = formatSignatures(formatted);

  // 4. Detectar y formatear headers de forwarded messages
  formatted = formatForwardedHeaders(formatted);

  // 5. Formatear listas y bullets
  formatted = formatLists(formatted);

  // 6. Resaltar URLs
  formatted = highlightUrls(formatted);

  // 7. Resaltar emails
  formatted = highlightEmails(formatted);

  // 8. Formatear texto en negrita (markdown style *)
  formatted = formatBoldText(formatted);

  return formatted;
}

/**
 * Parsea y formatea secciones citadas (quoted text)
 */
function parseQuotedSections(text) {
  const lines = text.split('\n');
  let result = [];
  let inQuote = false;
  let quoteLevel = 0;
  let quoteBuffer = [];

  for (let line of lines) {
    // Detectar nivel de citado
    const quoteMatch = line.match(/^(>+)\s*/);

    if (quoteMatch) {
      const currentLevel = quoteMatch[1].length;
      const content = line.replace(/^>+\s*/, '');

      if (!inQuote || currentLevel !== quoteLevel) {
        // Cerrar quote anterior si existe
        if (inQuote && quoteBuffer.length > 0) {
          result.push(wrapQuote(quoteBuffer.join('\n'), quoteLevel));
          quoteBuffer = [];
        }
        inQuote = true;
        quoteLevel = currentLevel;
      }

      quoteBuffer.push(content);
    } else {
      // No es quote, cerrar si había uno abierto
      if (inQuote && quoteBuffer.length > 0) {
        result.push(wrapQuote(quoteBuffer.join('\n'), quoteLevel));
        quoteBuffer = [];
        inQuote = false;
        quoteLevel = 0;
      }
      result.push(line);
    }
  }

  // Cerrar último quote si existe
  if (inQuote && quoteBuffer.length > 0) {
    result.push(wrapQuote(quoteBuffer.join('\n'), quoteLevel));
  }

  return result.join('\n');
}

/**
 * Envuelve texto citado en div con clase especial
 */
function wrapQuote(content, level) {
  return `<div class="email-quote email-quote-level-${level}">${content}</div>`;
}

/**
 * Detecta y formatea firmas de email
 */
function formatSignatures(text) {
  // Patrones comunes de firmas
  const signaturePatterns = [
    /--\s*\n/,  // Separador estándar "--"
    /\*Saludos cordiales,?\*/,
    /Atentamente,?/,
    /Cordialmente,?/,
    /Best regards,?/,
    /Antes de imprimir/i
  ];

  let formatted = text;

  // Buscar inicio de firma
  for (let pattern of signaturePatterns) {
    const match = formatted.match(pattern);
    if (match) {
      const index = match.index;
      const beforeSignature = formatted.substring(0, index);
      const signature = formatted.substring(index);

      formatted = beforeSignature + `<div class="email-signature">${signature}</div>`;
      break;
    }
  }

  return formatted;
}

/**
 * Formatea headers de mensajes reenviados
 */
function formatForwardedHeaders(text) {
  let formatted = text;

  // Patrón: "---------- Forwarded message ---------"
  formatted = formatted.replace(
    /(-{5,}\s*Forwarded message\s*-{5,})/gi,
    '<div class="forwarded-header">$1</div>'
  );

  // Patrón: "El dom, 29 jun 2025 a la(s) 10:46 p.m., NOMBRE escribió:"
  formatted = formatted.replace(
    /(El \w+,.*?escribió:)/gi,
    '<div class="reply-header">$1</div>'
  );

  // Patrón: "De: ... Date: ... Subject: ... To: ..."
  formatted = formatted.replace(
    /((?:De|From|Date|Subject|To|CC):\s*[^\n]+)/gi,
    '<div class="email-header-line">$1</div>'
  );

  return formatted;
}

/**
 * Formatea listas y bullets
 */
function formatLists(text) {
  let formatted = text;

  // Detectar listas con guiones
  formatted = formatted.replace(
    /^\s*-\s+(.+)$/gm,
    '<div class="email-list-item">• $1</div>'
  );

  // Detectar listas con asteriscos (que no sean markdown bold)
  formatted = formatted.replace(
    /^\s*\*\s+(?!\*)(.+)$/gm,
    '<div class="email-list-item">• $1</div>'
  );

  return formatted;
}

/**
 * Resalta URLs como enlaces clickeables
 */
function highlightUrls(text) {
  const urlPattern = /(https?:\/\/[^\s<]+)/gi;
  return text.replace(
    urlPattern,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="email-link">$1</a>'
  );
}

/**
 * Resalta direcciones de email
 */
function highlightEmails(text) {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  return text.replace(
    emailPattern,
    '<span class="email-address">$1</span>'
  );
}

/**
 * Formatea texto en negrita (markdown style con *)
 */
function formatBoldText(text) {
  // Solo formatear *texto* pero no ** (que puede ser parte de otros patrones)
  return text.replace(
    /\*([^*\n]+)\*/g,
    '<strong>$1</strong>'
  );
}

/**
 * Limpia y sanitiza el contenido
 */
export function sanitizeEmailContent(content) {
  if (!content) return '';

  // Remover posibles scripts (seguridad básica)
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Escapar otros tags HTML potencialmente peligrosos
  // (excepto los que nosotros creamos: div, span, a, strong)
  sanitized = sanitized.replace(/<(?!\/?(div|span|a|strong|br)\b)[^>]+>/gi, '');

  return sanitized;
}
