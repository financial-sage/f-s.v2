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
    | 'ghost-primary' | 'ghost-secondary' | 'ghost-success' | 'ghost-danger' | 'slide';
    buttonSize?: 'sm' | 'lg' | 'xl';
    open?: boolean;
    onClose?: () => void;
    onClick?: () => void;
}


export default function BlendyButton({
    buttonText = "Open",
    modalTitle = "Modal",
    modalContent = <p>Contenido del modal por defecto</p>,
    buttonVariant = 'primary',
    buttonSize,
    open,
    onClose,
    onClick
}: BlendyButtonProps) {
    const blendy = useRef<Blendy | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Si open está definido, el control es externo
    const isModalOpen = open !== undefined ? open : showModal;

    useEffect(() => {
        blendy.current = createBlendy({ animation: 'dynamic' });
        return () => { blendy.current = null; };
    }, []);

    const handleOpenModal = () => {
        setIsClosing(false);
        if (open === undefined) setShowModal(true);
        blendy.current?.toggle('example');
        if (onClick) onClick();
    };

    const handleCloseModal = () => {
        setIsClosing(true);
        blendy.current?.untoggle('example', () => {
            setTimeout(() => {
                setIsClosing(false);
                if (open === undefined) setShowModal(false);
                if (onClose) onClose();
            }, 300); // Duración de la animación CSS
        });
    };

    const getButtonClasses = () => {
        let classes = 'btn';
        if (buttonVariant?.startsWith('ghost-')) {
            classes += ` btn-ghost btn-${buttonVariant}`;
        } else {
            classes += ` btn-${buttonVariant}`;
        }
        if (buttonSize) {
            classes += ` btn-${buttonSize}`;
        }
        classes += ' blendy-button';
        return classes;
    };

    return (
        <div>
            {isModalOpen && createPortal(
                <Modal
                    onClose={handleCloseModal}
                    title={modalTitle}
                    content={modalContent}
                    closeModal={handleCloseModal}
                    isClosing={isClosing}
                />,
                document.body
            )}
            <button
                className='btn-slide'
                style={{ cursor: 'pointer' }}
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

export function Modal({ onClose, title = "Modal", content, closeModal, isClosing }: ModalProps) {
    // Renderizar contenido dinámico
    const renderContent = () => {
        if (typeof content === 'function') {
            return content(closeModal);
        }
        return content;
    };

    // Recibe isClosing como prop
    return (
        <div className="fixed inset-0 bg-black/70 z-60 lg:z-40">
            <div className={`modal z-50 border border-zinc-700${(typeof isClosing !== 'undefined' && isClosing) ? ' modal-closing' : ' modal-opening'}`} style={{ background: "var(--background-gradient)" }} data-blendy-to="example">
                <div className="modal__header border-b border-zinc-700">
                    <h2 className="text-zinc-400">{title}</h2>
                    <button
                        className="modal__close"
                        onClick={onClose}
                    ></button>
                </div>
                <div className="modal__content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}