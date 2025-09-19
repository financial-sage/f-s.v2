import { Blendy, createBlendy } from "blendy";
import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface BlendyButtonProps {
    buttonText?: string;
    modalTitle?: string;
    modalContent?: ReactNode | ((closeModal: () => void) => ReactNode);
    buttonVariant?: 
        | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light'
        | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' 
        | 'outline-warning' | 'outline-info' | 'outline-dark' | 'outline-light'
        | 'ghost-primary' | 'ghost-secondary' | 'ghost-success' | 'ghost-danger';
    buttonSize?: 'sm' | 'lg' | 'xl';
}

export default function BlendyButton({ 
    buttonText = "Open", 
    modalTitle = "Modal",
    modalContent = <p>Contenido del modal por defecto</p>,
    buttonVariant = 'primary',
    buttonSize
}: BlendyButtonProps) {
    const blendy = useRef<Blendy | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isCompletelyDone, setIsCompletelyDone] = useState(true); // Nuevo estado para control total

    useEffect(() => {
        blendy.current = createBlendy({ 
            animation: 'dynamic'
            // Nota: Blendy maneja internamente la duración de la animación
        });
        
        // Cleanup function para evitar problemas de memoria
        return () => {
            if (blendy.current) {
                // Si Blendy tiene un método destroy o cleanup, úsalo aquí
                blendy.current = null;
            }
        };
    }, []);

    const handleOpenModal = () => {
        setIsClosing(false);
        setIsAnimating(true);
        setIsCompletelyDone(false);
        setShowModal(true);
        blendy.current?.toggle('example');
        // Reset animating state after animation completes (tiempo más generoso)
        setTimeout(() => {
            setIsAnimating(false);
            setIsCompletelyDone(true);
        }, 800);
    };

    const handleCloseModal = () => {
        setIsClosing(true);
        setIsAnimating(true);
        setIsCompletelyDone(false);
        blendy.current?.untoggle('example', () => {
            setShowModal(false);
            // Primera fase: desactivar isAnimating (más tiempo para ver el efecto)
            setTimeout(() => {
                setIsAnimating(false);
            }, 300);
            // Segunda fase: desactivar isClosing (mucho más tiempo para que Blendy termine)
            setTimeout(() => {
                setIsClosing(false);
            }, 800);
            // Tercera fase: marcar como completamente terminado
            setTimeout(() => {
                setIsCompletelyDone(true);
            }, 1000);
        });
    };

    const getButtonClasses = () => {
        let classes = 'btn';
        
        // Manejar variantes especiales
        if (buttonVariant?.startsWith('ghost-')) {
            classes += ` btn-ghost btn-${buttonVariant}`;
        } else {
            classes += ` btn-${buttonVariant}`;
        }
        
        // Agregar tamaño si se especifica
        if (buttonSize) {
            classes += ` btn-${buttonSize}`;
        }
        
        // Agregar clase especial para desactivar efectos que interfieren con Blendy
        classes += ' blendy-button';
        
        // Solo aplicar estilos restrictivos si NO está completamente terminado
        if (!isCompletelyDone) {
            // Deshabilitar efectos durante la animación
            if (isAnimating) {
                classes += ' blendy-animating';
            }
            
            // Clase especial para el cierre (máxima estabilidad)
            if (isClosing) {
                classes += ' blendy-closing';
            }
        }
        
        return classes;
    };

    return (
        <div>
            {showModal && createPortal(
                <Modal 
                    onClose={handleCloseModal} 
                    title={modalTitle}
                    content={modalContent}
                    closeModal={handleCloseModal}
                />, 
                document.body
            )}
            <button 
                className={getButtonClasses()}
                data-blendy-from="example" 
                onClick={handleOpenModal}
            >
                <span>{buttonText}</span>
            </button>
        </div>
    );
}

interface ModalProps {
    onClose: React.MouseEventHandler<HTMLElement>;
    title?: string;
    content?: ReactNode | ((closeModal: () => void) => ReactNode);
    isClosing?: boolean;
    closeModal: () => void;
}

export function Modal({ onClose, title = "Modal", content, closeModal }: ModalProps) {
  const [isOpening, setIsOpening] = useState(true);

  useEffect(() => {
    // Activar la animación de apertura de la X después de un pequeño delay
    const timer = setTimeout(() => {
      setIsOpening(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (e: React.MouseEvent<HTMLElement>) => {
    // Agregar clase de cierre antes de ejecutar onClose
    const closeButton = e.currentTarget;
    closeButton.classList.add('closing');
    
    // Pequeño delay para mostrar la animación de cierre
    setTimeout(() => {
      onClose(e);
    }, 200);
  };

  // Renderizar contenido dinámico
  const renderContent = () => {
    if (typeof content === 'function') {
      return content(closeModal);
    }
    return content;
  };

  return (
    <div className="modal z-50" style={{ background: "var(--background-gradient)" }} data-blendy-to="example">
      <div>
        <div className="modal__header border-b border-zinc-700">
          <h2 className="text-zinc-400">{title}</h2>
          <button 
            className={`modal__close ${isOpening ? 'opening' : ''}`}
            onClick={handleClose}
          ></button>
        </div>
        <div className="modal__content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}