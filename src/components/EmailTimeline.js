import React, { useState } from 'react';
import '../styles/EmailTimeline.css';
import { formatEmailContent, sanitizeEmailContent } from '../utils/emailFormatter';
import EmailModal from './EmailModal';

/**
 * Componente Timeline para mostrar hilos de correos expandibles
 * Ahora recibe los datos completos directamente del SSE (no hace fetch)
 */
const EmailTimeline = ({ threadInfo }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha desconocida';

    try {
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        return dateStr;
      }

      return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getParticipants = () => {
    const participants = new Set();
    threadInfo.emails.forEach(email => {
      if (email.sender) participants.add(email.sender);
    });
    return Array.from(participants);
  };

  const getFirstAndLastDate = () => {
    if (!threadInfo.emails || threadInfo.emails.length === 0) {
      return { first: null, last: null };
    }

    const dates = threadInfo.emails
      .map(e => e.date)
      .filter(d => d)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) {
      return { first: null, last: null };
    }

    dates.sort((a, b) => a - b);
    return {
      first: dates[0].toISOString(),
      last: dates[dates.length - 1].toISOString()
    };
  };

  const { first: firstDate, last: lastDate } = getFirstAndLastDate();
  const participants = getParticipants();

  // Obtener el subject del primer correo
  const mainSubject = threadInfo.emails[0]?.subject || 'Hilo de correos';

  return (
    <div className="email-timeline-container">
      {/* Header del hilo */}
      <div className="thread-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="thread-info">
          <span className="thread-badge">
            📧 Hilo con {threadInfo.email_count} correo{threadInfo.email_count > 1 ? 's' : ''}
          </span>
          <span className="thread-subject">{mainSubject}</span>
        </div>
        <button className="thread-toggle-btn">
          <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </button>
      </div>

      {/* Timeline expandible */}
      {isExpanded && (
        <div className="timeline-content">
          <div className="timeline-header">
            <div className="timeline-meta">
              {firstDate && lastDate && (
                <span>📅 {formatDate(firstDate)} → {formatDate(lastDate)}</span>
              )}
              {participants.length > 0 && (
                <span>👥 {participants.join(', ')}</span>
              )}
            </div>
          </div>

          <div className="timeline-emails">
            {threadInfo.emails.map((email, index) => (
              <div key={email.message_id || index} className="timeline-email">
                <div className="timeline-dot"></div>
                {index < threadInfo.emails.length - 1 && <div className="timeline-line"></div>}

                <div className="email-card">
                  <div className="email-header">
                    <span className="email-date">{formatDate(email.date)}</span>
                  </div>

                  <div className="email-sender">
                    <strong>De:</strong> {email.sender}
                  </div>

                  {email.recipients && (
                    <div className="email-recipients">
                      <strong>Para:</strong> {email.recipients}
                    </div>
                  )}

                  {email.cc && (
                    <div className="email-cc">
                      <strong>CC:</strong> {email.cc}
                    </div>
                  )}

                  <div className="email-subject">
                    <strong>Asunto:</strong> {email.subject}
                  </div>

                  {/* Botón para abrir correo completo */}
                  <div className="email-actions">
                    <button
                      className="open-email-btn"
                      onClick={() => setSelectedEmail(email)}
                    >
                      📧 Abrir correo completo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para correo completo */}
      {selectedEmail && (
        <EmailModal
          email={selectedEmail}
          imagesMapping={threadInfo.images_mapping}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
};

export default EmailTimeline;
