import React, { useState, useEffect, useRef } from 'react';
import '../styles/Chatbot.css';
import logo from '../assets/logo.png';
import { marked } from 'marked';
import { useSuggestions } from '../hooks/useSuggestions';

// 🎯 1. DEFINICIÓN DE LA URL BASE DESDE LA VARIABLE DE ENTORNO
// Usamos process.env.REACT_APP_API_BASE_URL (asumiendo Create React App)
// Si usas Vite, sería: const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState([]); 
  const [showThinking, setShowThinking] = useState(false); 
  const [previewImage, setPreviewImage] = useState(null);
  const placeholderIndexRef = useRef(null);
  const threadIdRef = useRef(getOrCreateThreadId());

  const currentBotMessageRef = useRef('');

  // Estados para sugerencias
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const { suggestions, searchSuggestions, clearSuggestions } = useSuggestions(300, 3);
  const suggestionsRef = useRef(null);

  // Bienvenida...
  useEffect(() => {
    const welcomeMessage = "Hola!";
    const typingSpeed = 100;
    let idx = 0;
    const type = () => {
      if (idx < welcomeMessage.length) {
        setMessages([{ text: welcomeMessage.slice(0, idx + 1), sender: 'bot' }]);
        idx++;
        setTimeout(type, typingSpeed);
      } else {
        setTimeout(() => {
          setIsWelcomeScreen(false);
          setMessages([{ text: 'Hola! ¿Cómo puedo ayudarte?', sender: 'bot' }]);
        }, 1000);
      }
    };
    type();
  }, []);

  // Configuración básica de marked
  useEffect(() => {
    const renderer = new marked.Renderer();
    marked.setOptions({ renderer });
    
    return () => {
        marked.setOptions({ renderer: new marked.Renderer() });
    };
  }, []);

const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    // Comprobación de que la URL de la API está disponible antes de enviar
    if (!API_BASE_URL) {
        console.error("Error: API_BASE_URL no está definida. Verifica tu archivo .env.");
        alert("Error de configuración: La dirección de la API no se encontró.");
        return;
    }

    const userInput = textToSend;
    setMessages(prev => [...prev, { text: userInput, sender: 'user' }]);
    setInput('');
    setIsBotTyping(true);

    // Limpiar sugerencias
    clearSuggestions();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    currentBotMessageRef.current = '';

    setMessages(prev => {
      placeholderIndexRef.current = prev.length;
      return [...prev, { text: '', sender: 'bot' }];
    });

    try {
      // 🎯 2. USO DE LA VARIABLE DE ENTORNO EN EL FETCH
      const res = await fetch(`${API_BASE_URL}/agent/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userInput,
          thread_id: threadIdRef.current,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let start, end;
        while ((start = buffer.indexOf('{')) !== -1 && (end = buffer.indexOf('}', start)) !== -1) {
          const jsonStr = buffer.slice(start, end + 1);
          buffer = buffer.slice(end + 1);
          try {
            const tokenObj = JSON.parse(jsonStr);
            
            // Verificar si es un paso de pensamiento
            if (tokenObj.step) {
              setThinkingSteps(prev => [...prev, tokenObj.step]);
            } else {
              // Si no es un paso, se trata como token de mensaje normal
              const token = tokenObj.token || '';
              currentBotMessageRef.current += token;

              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages[placeholderIndexRef.current]) {
                  newMessages[placeholderIndexRef.current].text = currentBotMessageRef.current;
                }
                return newMessages;
              });
            }

          } catch {
             // Ignorar errores de parseo
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const msgs = [...prev];
        if(msgs[placeholderIndexRef.current]) {
            msgs[placeholderIndexRef.current].text = 'Hubo un problema procesando tu consulta...';
        }
        return msgs;
      });
    } finally {
      // Limpiar los pasos de pensamiento al finalizar
      setThinkingSteps([]);
      setShowThinking(false);
      setIsBotTyping(false);
    }
  };

  // Auto-scroll y añadir eventos a imágenes
  useEffect(() => {
    const chat = document.querySelector('.chatbot-messages');
    if (chat) chat.scrollTop = chat.scrollHeight;
    
    const messageTextElements = document.querySelectorAll('.message.bot .message-text');
    messageTextElements.forEach(el => {
        const images = el.querySelectorAll('img.chatbot-image');
        images.forEach(img => {
            if (!img.hasAttribute('data-listener-added')) {
                img.addEventListener('click', () => setPreviewImage(img.src));
                img.setAttribute('data-listener-added', 'true');
            }
        });
    });
  }, [messages, isBotTyping]);
  
  function getOrCreateThreadId() {
    let id = localStorage.getItem('thread_id');
    if (!id) {
      id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
      localStorage.setItem('thread_id', id);
    }
    return id;
  }

  // Manejar cambio en el input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    // Buscar sugerencias
    if (value.trim().length >= 3) {
      searchSuggestions(value);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
      clearSuggestions();
    }
  };

  // Manejar selección de sugerencia
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setShowSuggestions(false);
    clearSuggestions();
    setSelectedSuggestionIndex(-1);
  };

  // Manejar navegación con teclado
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const suggestion = suggestions[selectedSuggestionIndex];
          setInput(suggestion);
          setShowSuggestions(false);
          clearSuggestions();
          setSelectedSuggestionIndex(-1);
          // Enviar mensaje inmediatamente
          handleSendMessage(suggestion);
        } else {
          handleSendMessage();
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;

      default:
        break;
    }
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll automático en sugerencias cuando se navega con teclado
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedSuggestionIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedSuggestionIndex]); 

  if (isWelcomeScreen) { 
    return ( 
      <div className="chatbot-welcome"> 
        <div className="welcome-icon"> 
          <img src={logo} alt="Chatbot icon" /> 
        </div> 
        <div className="welcome-text typing"> 
          {messages[0]?.text} 
        </div> 
      </div> 
    ); 
  } 

  return ( 
    <div className="page-container"> 
      <div className="chatbot"> 
        <div className="chatbot-messages"> 
          {messages.map((msg, i) => ( 
            <div key={i} className={`message ${msg.sender}`}> 
              {msg.sender === 'bot' && <img src={logo} alt="Chatbot icon" />} 
              <div 
                className="message-text" 
                dangerouslySetInnerHTML={{ 
                  __html: msg.sender === 'bot' ? marked.parse(msg.text) : msg.text, 
                }} 
              /> 
            </div> 
          ))} 
          {isBotTyping && !currentBotMessageRef.current && ( 
            <div className="message bot thinking-container">
              <div className="thinking-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <div className="thinking-header" onClick={() => setShowThinking(!showThinking)}>
                <span>Pensando...</span>
                <span className={`toggle-icon ${showThinking ? 'open' : ''}`}>▼</span>
              </div>
              {showThinking && (
                <div className="thinking-steps">
                  {thinkingSteps.map((step, index) => (
                    <div key={index} className="thinking-step">
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )} 
        </div>
        <div className="chatbot-input-container">
          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe un mensaje..."
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => handleSendMessage()}>Enviar</button>
          </div>
          {/* Dropdown de sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown" ref={suggestionsRef}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div> 
        <div className="disclaimer">
          <p>La IA puede cometer errores; siempre verifica la información crítica.</p>
        </div> 
      </div> 
      {/* Modal de vista previa de imagen */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <span className="image-preview-close">&times;</span>
          <img className="image-preview-content" src={previewImage} alt="Vista previa" />
        </div>
      )}
    </div> 
  ); 
};

export default Chatbot;