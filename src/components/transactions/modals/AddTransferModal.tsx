import { Blendy, createBlendy } from "blendy";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconCircleButton from "../../common/IconCircleButton";
import { BiTransferAlt } from "react-icons/bi";
import TransferForm from "../TransferForm";

export default function AddTransferModal() {
  const blendy = useRef<Blendy | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' })
  }, []);


  return (
    <div>
      {showModal
        && createPortal(<Modal onClose={() => {
          blendy.current?.untoggle('modal-transfer', () => {
            setShowModal(false)
          })
        }}></Modal>, document.body)
      }
      <IconCircleButton
        data-blendy-from="modal-transfer"
        onClick={() => {
          setShowModal(true)
          blendy.current?.toggle('modal-transfer')
        }}
        ariaLabel="Realizar transferencia"
        icon={<BiTransferAlt size={20} color="#FFF" />}
        label="Transf."
      />
    </div>
  );
}

interface ModalProps {
  onClose: React.MouseEventHandler<HTMLElement>;
}

function Modal({ onClose }: ModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose}></div>
      <div className="modal z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to="modal-transfer">
        <div>
          <div className="modal__header border-b border-zinc-700">
            <h2 className="text-zinc-400">Transferencia</h2>
            <button className="modal__close" onClick={onClose}></button>
          </div>
          <div className="modal__content">
            <div className="p-4">
              <TransferForm/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}