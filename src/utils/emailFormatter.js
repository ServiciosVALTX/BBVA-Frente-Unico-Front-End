/**
 * Utilidades para formatear contenido de correos electrónicos
 * Convierte el texto plano de emails en HTML estructurado y legible
 */

/**
 * Divide el contenido de un thread en correos individuales
 * Detecta patrones como "El X escribió:" y "---------- Forwarded message ---------"
 * @param {string} threadContent - Contenido completo del thread
 * @returns {Array} - Array de objetos con {content, metadata} para cada correo
 */
export function splitThreadIntoEmails(threadContent) {
  if (!threadContent) return [];

  // Patrones para detectar inicio de un nuevo correo en el thread
  const emailSeparatorPatterns = [
    // Patrón: "El mar, 1 jul 2025 a la(s) 2:11 p.m., NOMBRE (email@domain.com) escribió:"
    /El\s+\w+,\s+\d+\s+\w+\s+\d{4}\s+a\s+la\(s\)\s+[^,]+,\s+([^(]+)\s*\(([^)]+)\)\s+escribió:/gi,
    // Patrón: "---------- Forwarded message ---------"
    /-{5,}\s*Forwarded message\s*-{5,}/gi,
  ];

  const emails = [];
  let currentEmailContent = '';
  let lastIndex = 0;

  // Buscar todos los separadores en el texto
  const matches = [];

  emailSeparatorPatterns.forEach(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(threadContent)) !== null) {
      matches.push({
        index: match.index,
        match: match[0],
        sender: match[1] ? match[1].trim() : null,
        email: match[2] ? match[2].trim() : null
      });
    }
  });

  // Ordenar matches por índice
  matches.sort((a, b) => a.index - b.index);

  // Si no hay separadores, devolver el contenido completo como un solo correo
  if (matches.length === 0) {
    return [{
      content: threadContent,
      sender: null,
      index: 0
    }];
  }

  // Dividir el contenido basándose en los separadores encontrados
  matches.forEach((match, idx) => {
    // Contenido desde el último índice hasta este separador
    if (idx === 0 && match.index > 0) {
      // Primer correo (antes del primer separador)
      emails.push({
        content: threadContent.substring(0, match.index).trim(),
        sender: null,
        index: 0
      });
    }

    // Determinar el final de este correo
    const nextMatch = matches[idx + 1];
    const endIndex = nextMatch ? nextMatch.index : threadContent.length;

    // Extraer contenido de este correo (después del separador)
    const emailContent = threadContent.substring(match.index + match.match.length, endIndex).trim();

    if (emailContent) {
      emails.push({
        content: emailContent,
        sender: match.sender,
        email: match.email,
        index: idx + 1
      });
    }
  });

  return emails;
}

/**
 * Formatea el contenido de un correo para mejor visualización
 * @param {string} emailBody - Contenido del correo en texto plano
 * @param {Object} imagesMapping - Mapeo de <Imagen N> a filename (opcional)
 * @returns {string} - HTML formateado
 */
export function formatEmailContent(emailBody, imagesMapping = null) {
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

  // 9. Convertir placeholders de imágenes <Imagen N> a imágenes reales
  formatted = formatImagePlaceholders(formatted, imagesMapping);

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
 * Convierte placeholders de imágenes <Imagen N> a tags <img>
 * @param {string} text - Texto con placeholders <Imagen N>
 * @param {Object} imagesMapping - Mapeo de "<Imagen N>" a filename
 * @returns {string} - Texto con imágenes renderizadas
 */
function formatImagePlaceholders(text, imagesMapping = null) {
  // Obtener API_BASE_URL desde variable de entorno
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8003';

  // Debug
  console.log('formatImagePlaceholders - imagesMapping:', imagesMapping);

  // Contador único para IDs
  let uniqueCounter = Math.floor(Math.random() * 100000);

  // ESTRATEGIA: Buscar todos los <Imagen N>: y extraer descripciones manualmente
  // Esto es más robusto que regex complejos

  let processedText = text;
  const imageMatches = [];

  // Encontrar todas las posiciones de <Imagen N>:
  // Nota: Puede incluir caracteres extra como ">>> <Imagen 4>:"
  const regex = /(?:>>>)?\s*<Imagen\s+(\d+)>:/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    imageMatches.push({
      number: match[1],
      start: match.index,
      fullMatch: match[0]
    });
  }

  // QUICK FIX: Detectar y eliminar duplicados
  // Si hay múltiples bloques de la misma imagen con descripciones similares,
  // mantener solo la primera ocurrencia
  const uniqueImages = new Map();
  const imagesToKeep = [];

  for (const img of imageMatches) {
    const key = img.number;

    if (!uniqueImages.has(key)) {
      // Primera vez que vemos esta imagen
      uniqueImages.set(key, img);
      imagesToKeep.push(img);
    } else {
      // Ya vimos esta imagen antes
      const firstOccurrence = uniqueImages.get(key);

      // Calcular la distancia entre la primera y esta ocurrencia
      const distance = img.start - firstOccurrence.start;

      // Si están muy separadas (>200 caracteres), probablemente sea un duplicado del thread
      // En lugar de procesar este duplicado, lo marcaremos para eliminación
      if (distance > 200) {
        console.log(`⚠️ Detectado duplicado de Imagen ${key} a ${distance} chars de distancia - será eliminado`);
        // No agregamos a imagesToKeep
      } else {
        // Están muy cerca, probablemente sea legítimo
        imagesToKeep.push(img);
      }
    }
  }

  // Usar solo las imágenes no duplicadas
  const finalImageMatches = imagesToKeep;

  console.log(`Total imágenes encontradas: ${imageMatches.length}, después de deduplicar: ${finalImageMatches.length}`);

  if (finalImageMatches.length === 0) {
    // No hay descripciones VL, buscar placeholders simples
    return processedText.replace(/<Imagen\s+(\d+)>/gi, (match, imageNumber) => {
      const placeholder = `<Imagen ${imageNumber}>`;

      if (imagesMapping && imagesMapping[placeholder]) {
        const filename = imagesMapping[placeholder];
        const imageUrl = `${API_BASE_URL}/images/${encodeURIComponent(filename)}`;

        return `
          <div class="email-image-container">
            <img src="${imageUrl}" alt="Imagen ${imageNumber}" class="email-embedded-image" />
          </div>
        `;
      }

      return `
        <div class="email-image-placeholder">
          <div class="image-icon">🖼️</div>
          <div class="image-label">
            <strong>Imagen ${imageNumber}</strong>
            <small>(La imagen original está disponible en el hilo del correo)</small>
          </div>
        </div>
      `;
    });
  }

  // Procesar de atrás hacia adelante para no afectar índices
  for (let i = finalImageMatches.length - 1; i >= 0; i--) {
    const current = finalImageMatches[i];
    const imageNumber = current.number;
    const placeholder = `<Imagen ${imageNumber}>`;

    // Encontrar el final de la descripción
    let endIndex;

    // Buscar el siguiente <Imagen N>: o marcadores de fin
    const nextImageIndex = i < finalImageMatches.length - 1 ? finalImageMatches[i + 1].start : -1;

    // Marcadores que indican fin de descripción
    const endMarkers = [
      /\n\n\*Saludos/,
      /\n\nSaludos cordiales/,
      /\n\nAtentamente/,
      /\n\nCordialmente/,
      /\nAntes de imprimir/,
      /\n\n--\n/,
      /\nEl \w+,.*?escribió:/,
      /\n-{5,}\s*Forwarded message/
    ];

    const afterStart = text.substring(current.start + current.fullMatch.length);
    let minEndIndex = afterStart.length;

    // Buscar el marcador más cercano
    for (const marker of endMarkers) {
      const markerMatch = afterStart.match(marker);
      if (markerMatch && markerMatch.index < minEndIndex) {
        minEndIndex = markerMatch.index;
      }
    }

    // Si hay otra imagen después, usar eso como límite
    if (nextImageIndex > 0) {
      const distanceToNext = nextImageIndex - (current.start + current.fullMatch.length);
      if (distanceToNext < minEndIndex) {
        minEndIndex = distanceToNext;
      }
    }

    // Extraer la descripción
    const description = afterStart.substring(0, minEndIndex).trim();

    // Generar ID único
    uniqueCounter++;
    const toggleId = `img-desc-${imageNumber}-${uniqueCounter}`;

    // Construir HTML de reemplazo
    let replacement;

    if (imagesMapping && imagesMapping[placeholder]) {
      const filename = imagesMapping[placeholder];
      const imageUrl = `${API_BASE_URL}/images/${encodeURIComponent(filename)}`;

      replacement = `
        <div class="email-image-container">
          <img src="${imageUrl}" alt="Imagen ${imageNumber}" class="email-embedded-image" />
          <div class="image-description-wrapper">
            <button
              class="toggle-description-btn"
              data-target="${toggleId}"
            >
              <span class="toggle-icon">▼</span> Ver descripción de la imagen
            </button>
            <div id="${toggleId}" class="image-description-collapsible">
              ${description}
            </div>
          </div>
        </div>
      `;
    } else {
      replacement = `
        <div class="email-image-placeholder">
          <div class="image-icon">🖼️</div>
          <div class="image-label">
            <strong>Imagen ${imageNumber}</strong>
            <small>(La imagen original está disponible en el hilo del correo)</small>
          </div>
          <div class="image-description-wrapper">
            <button
              class="toggle-description-btn"
              data-target="${toggleId}"
            >
              <span class="toggle-icon">▼</span> Ver descripción
            </button>
            <div id="${toggleId}" class="image-description-collapsible">
              ${description}
            </div>
          </div>
        </div>
      `;
    }

    // Reemplazar desde el inicio del <Imagen N>: hasta el final de la descripción
    const startPos = current.start;
    const endPos = current.start + current.fullMatch.length + minEndIndex;

    processedText = processedText.substring(0, startPos) + replacement + processedText.substring(endPos);
  }

  return processedText;
}

/**
 * Limpia y sanitiza el contenido
 */
export function sanitizeEmailContent(content) {
  if (!content) return '';

  // Remover posibles scripts (seguridad básica)
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Escapar otros tags HTML potencialmente peligrosos
  // (excepto los que nosotros creamos: div, span, a, strong, br, img, small, button)
  sanitized = sanitized.replace(/<(?!\/?(div|span|a|strong|br|img|small|button)\b)[^>]+>/gi, '');

  return sanitized;
}
