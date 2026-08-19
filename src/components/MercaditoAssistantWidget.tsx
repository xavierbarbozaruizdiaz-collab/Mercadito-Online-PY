'use client';

// ============================================
// MERCADITO ONLINE PY - ASISTENTE WIDGET
// Widget flotante del asistente virtual
// ============================================

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'assistant' | 'user';
  timestamp: Date;
}

export default function MercaditoAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 ¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar posición guardada
  useEffect(() => {
    const saved = localStorage.getItem('assistant_position');
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        setPosition({ x, y });
      } catch (e) {
        console.warn('Error loading assistant position:', e);
      }
    }
  }, []);

  // Guardar posición
  const savePosition = (x: number, y: number) => {
    localStorage.setItem('assistant_position', JSON.stringify({ x, y }));
  };

  // Enviar mensaje
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simular respuesta del asistente
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getAssistantResponse(inputValue.trim()),
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  // Obtener respuesta del asistente (simplificado)
  const getAssistantResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('buscar') || lowerQuery.includes('producto')) {
      return 'Puedes usar la barra de búsqueda en la parte superior o filtrar por categoría, precio y más. También puedes usar el botón "¿Qué querés comprar?" para crear un pedido personalizado.';
    }
    
    if (lowerQuery.includes('vender') || lowerQuery.includes('publicar')) {
      return 'Para vender productos, necesitas crear una cuenta de vendedor. Ve al Dashboard y selecciona "Nuevo Producto" para comenzar.';
    }
    
    if (lowerQuery.includes('subasta') || lowerQuery.includes('puja')) {
      return 'Las subastas están disponibles en la sección "Subastas" del menú. Puedes pujar por productos o crear tus propias subastas.';
    }
    
    return 'Gracias por tu mensaje. Estoy aquí para ayudarte con cualquier pregunta sobre el marketplace. ¿Hay algo específico en lo que pueda ayudarte?';
  };

  // Scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Manejar inicio de arrastre (mouse y touch)
  const handleStartDrag = (clientX: number, clientY: number) => {
    if (buttonRef.current) {
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      setDragStart({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStartDrag(touch.clientX, touch.clientY);
  };

  // Manejar arrastre (mouse y touch)
  useEffect(() => {
    if (!isDragging) return;

    const updatePosition = (clientX: number, clientY: number) => {
      const newX = clientX - dragStart.x;
      const newY = clientY - dragStart.y;
      
      // Limitar dentro de la ventana
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      updatePosition(touch.clientX, touch.clientY);
    };

    const handleEndDrag = () => {
      setIsDragging(false);
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        savePosition(rect.left, rect.top);
      }
    };

    const handleMouseUp = () => {
      handleEndDrag();
    };

    const handleTouchEnd = () => {
      handleEndDrag();
    };

    // Agregar listeners para mouse y touch
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  return (
    <>
      {/* Botón flotante */}
      <button
        ref={buttonRef}
        onClick={() => {
          if (!isDragging) {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`fixed z-50 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl transition-all touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
        }}
        aria-label="Abrir asistente"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Panel del asistente */}
      {isOpen && (
        <div
          ref={panelRef}
          className={`fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all ${
            isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
          }`}
          style={{
            left: `${position.x}px`,
            top: `${position.y + 70}px`,
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-semibold">Asistente Virtual</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label={isMinimized ? 'Maximizar' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(100%-60px)]">
              {/* Área de mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg p-3 max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-blue-100 ml-auto'
                        : 'bg-gray-100'
                    }`}
                  >
                    <p className="text-sm text-gray-700">{message.text}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputValue.trim()) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
