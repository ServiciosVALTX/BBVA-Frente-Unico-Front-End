import React from 'react';
import '../styles/EmailModal.css';
import { formatEmailContent, sanitizeEmailContent, splitThreadIntoEmails } from '../utils/emailFormatter';

/**
 * Modal para mostrar el contenido completo de correos como slides navegables
 */
const EmailModal = ({ emails, initialEmailIndex = 0, imagesMapping, onClose }) => {
  // Dividir el contenido del primer correo en correos individuales si contiene un thread
  const [allEmails, setAllEmails] = React.useState([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (!emails || emails.length === 0) return;

    // Si hay múltiples emails en el array, usarlos directamente
    if (emails.length > 1) {
      setAllEmails(emails);
      setCurrentIndex(initialEmailIndex);
      return;
    }

    // Si solo hay 1 email, intentar dividirlo en sub-correos basándose en el contenido
    const firstEmail = emails[0];
    const splitEmails = splitThreadIntoEmails(firstEmail.body_text || '');

    if (splitEmails.length > 1) {
      // Se encontraron múltiples correos en el thread
      const parsedEmails = splitEmails.map((split, idx) => ({
        message_id: `${firstEmail.message_id}_split_${idx}`,
        subject: idx === 0 ? firstEmail.subject : `Re: ${firstEmail.subject}`,
        sender: split.sender || (idx === 0 ? firstEmail.sender : 'Desconocido'),
        recipients: firstEmail.recipients,
        cc: firstEmail.cc,
        date: firstEmail.date,
        body_text: split.content,
        source_file: firstEmail.source_file
      }));

      setAllEmails(parsedEmails);
      setCurrentIndex(0);
    } else {
      // No se pudo dividir, usar el email original
      setAllEmails(emails);
      setCurrentIndex(initialEmailIndex);
    }
  }, [emails, initialEmailIndex]);

  // Cerrar con tecla Escape y navegación con flechas
  React.useEffect(() => {
    if (!allEmails || allEmails.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < allEmails.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [allEmails, currentIndex, onClose]);

  if (!allEmails || allEmails.length === 0) return null;

  const currentEmail = allEmails[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allEmails.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (hasNext) setCurrentIndex(currentIndex + 1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha desconocida';

    try {
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        return dateStr;
      }

      return date.toLocaleString('es-PE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Cerrar modal al hacer clic en el overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="email-modal-overlay" onClick={handleOverlayClick}>
      <div className="email-modal-container">
        {/* Header del modal con navegación */}
        <div className="email-modal-header">
          <div className="email-modal-header-content">
            <h2 className="email-modal-title">Hilo de Correos</h2>
            <div className="email-modal-counter">
              {currentIndex + 1} / {allEmails.length}
            </div>
          </div>
          <button className="email-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Contenido del modal con slides */}
        <div className="email-modal-content">
          {/* Botones de navegación */}
          {hasPrevious && (
            <button
              className="email-nav-button prev"
              onClick={goToPrevious}
              aria-label="Correo anterior"
            >
              ‹
            </button>
          )}

          {hasNext && (
            <button
              className="email-nav-button next"
              onClick={goToNext}
              aria-label="Siguiente correo"
            >
              ›
            </button>
          )}

          {/* Metadata del correo actual */}
          <div className="email-modal-meta">
            <div className="email-modal-meta-row">
              <strong>Asunto:</strong>
              <span>{currentEmail.subject}</span>
            </div>

            <div className="email-modal-meta-row">
              <strong>De:</strong>
              <span>{currentEmail.sender}</span>
            </div>

            {currentEmail.recipients && (
              <div className="email-modal-meta-row">
                <strong>Para:</strong>
                <span>{currentEmail.recipients}</span>
              </div>
            )}

            {currentEmail.cc && (
              <div className="email-modal-meta-row">
                <strong>CC:</strong>
                <span>{currentEmail.cc}</span>
              </div>
            )}

            <div className="email-modal-meta-row">
              <strong>Fecha:</strong>
              <span>{formatDate(currentEmail.date)}</span>
            </div>
          </div>

          {/* Separador */}
          <div className="email-modal-divider"></div>

          {/* Body del correo actual con imágenes */}
          <div className="email-modal-body">
            <div
              className="email-modal-text"
              dangerouslySetInnerHTML={{
                __html: sanitizeEmailContent(
                  formatEmailContent(currentEmail.body_text || '', imagesMapping)
                )
              }}
            />
          </div>
        </div>

        {/* Footer del modal con indicadores de navegación */}
        <div className="email-modal-footer">
          {/* Indicadores de slides (dots) */}
          {allEmails.length > 1 && (
            <div className="email-slides-indicators">
              {allEmails.map((_, index) => (
                <button
                  key={index}
                  className={`slide-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Ir al correo ${index + 1}`}
                />
              ))}
            </div>
          )}

          <div className="email-modal-footer-actions">
            {hasPrevious && (
              <button className="email-modal-nav-btn" onClick={goToPrevious}>
                ← Anterior
              </button>
            )}
            <button className="email-modal-close-btn" onClick={onClose}>
              Cerrar
            </button>
            {hasNext && (
              <button className="email-modal-nav-btn" onClick={goToNext}>
                Siguiente →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
