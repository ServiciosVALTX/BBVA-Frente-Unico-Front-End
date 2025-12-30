import React from 'react';
import '../styles/EmailModal.css';
import { formatEmailContent, sanitizeEmailContent } from '../utils/emailFormatter';

/**
 * Modal para mostrar el contenido completo de un correo con imágenes
 */
const EmailModal = ({ email, imagesMapping, onClose }) => {
  // Cerrar con tecla Escape
  React.useEffect(() => {
    if (!email) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';

    // Debug: ver qué está recibiendo el modal
    console.log('EmailModal - email:', email.subject);
    console.log('EmailModal - imagesMapping:', imagesMapping);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [email, onClose, imagesMapping]);

  if (!email) return null;

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
        {/* Header del modal */}
        <div className="email-modal-header">
          <h2 className="email-modal-title">Correo Completo</h2>
          <button className="email-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="email-modal-content">
          {/* Metadata del correo */}
          <div className="email-modal-meta">
            <div className="email-modal-meta-row">
              <strong>Asunto:</strong>
              <span>{email.subject}</span>
            </div>

            <div className="email-modal-meta-row">
              <strong>De:</strong>
              <span>{email.sender}</span>
            </div>

            {email.recipients && (
              <div className="email-modal-meta-row">
                <strong>Para:</strong>
                <span>{email.recipients}</span>
              </div>
            )}

            {email.cc && (
              <div className="email-modal-meta-row">
                <strong>CC:</strong>
                <span>{email.cc}</span>
              </div>
            )}

            <div className="email-modal-meta-row">
              <strong>Fecha:</strong>
              <span>{formatDate(email.date)}</span>
            </div>
          </div>

          {/* Separador */}
          <div className="email-modal-divider"></div>

          {/* Body del correo con imágenes */}
          <div className="email-modal-body">
            <div
              className="email-modal-text"
              dangerouslySetInnerHTML={{
                __html: sanitizeEmailContent(
                  formatEmailContent(email.body_text || '', imagesMapping)
                )
              }}
            />
          </div>
        </div>

        {/* Footer del modal */}
        <div className="email-modal-footer">
          <button className="email-modal-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
