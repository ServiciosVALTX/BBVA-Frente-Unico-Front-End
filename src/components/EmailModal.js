import React from 'react';
import '../styles/EmailModal.css';
import { formatEmailContent, sanitizeEmailContent } from '../utils/emailFormatter';

/**
 * Modal para mostrar el contenido completo de correos como slides navegables
 *
 * Arquitectura:
 * - 1 archivo .eml = 1 slide (incluso si contiene thread anidado con Re:/Fwd:)
 * - Múltiples archivos .eml relacionados = múltiples slides navegables
 */
const EmailModal = ({ emails, initialEmailIndex = 0, imagesMapping, onClose }) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialEmailIndex);

  React.useEffect(() => {
    setCurrentIndex(initialEmailIndex);
  }, [initialEmailIndex]);

  // Cerrar con tecla Escape y navegación con flechas
  React.useEffect(() => {
    if (!emails || emails.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < emails.length - 1) {
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
  }, [emails, currentIndex, onClose]);

  // Event listener para botones de toggle de descripciones VL
  React.useEffect(() => {
    const handleToggleClick = (e) => {
      const button = e.target.closest('.toggle-description-btn');
      if (!button) return;

      const targetId = button.getAttribute('data-target');
      const targetDiv = document.getElementById(targetId);

      if (targetDiv) {
        button.classList.toggle('active');
        targetDiv.classList.toggle('visible');
      }
    };

    // Agregar listener al contenedor del modal
    const modalBody = document.querySelector('.email-modal-body');
    if (modalBody) {
      modalBody.addEventListener('click', handleToggleClick);
    }

    return () => {
      if (modalBody) {
        modalBody.removeEventListener('click', handleToggleClick);
      }
    };
  }, [currentIndex]); // Re-ejecutar cuando cambie el slide

  if (!emails || emails.length === 0) return null;

  const currentEmail = emails[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < emails.length - 1;

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
              {currentIndex + 1} / {emails.length}
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
              <strong>Archivo:</strong>
              <span>
                {currentEmail.source_file}
                {currentEmail.cited_by_agent && (
                  <span className="cited-badge-modal" title="Citado por el agente"> ⭐ Citado</span>
                )}
              </span>
            </div>

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
          {emails.length > 1 && (
            <div className="email-slides-indicators">
              {emails.map((_, index) => (
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
