import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Blendy, createBlendy } from "blendy";
import { Category, getUserCategories } from "@/src/lib/supabase/categories";
import { supabase } from '@/src/lib/supabase/client';
import { addTransaction, NewTransaction } from "@/src/lib/supabase/transactions";
import { CategoryIcon } from "../../categories/CategoryIcons";
import { CiReceipt } from "react-icons/ci";
import IconCircleButton from '@/src/components/common/IconCircleButton';

interface AccountTransactionModalProps {
  accountId: string;
  categories?: Category[];
}

export default function AccountTransactionModal({ accountId, categories: propCategories }: AccountTransactionModalProps) {
  const blendy = useRef<Blendy | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' })
  }, [])

  // Cargar categorías cuando se abre el modal si no vienen por prop
  useEffect(() => {
    if (!showModal) return;
    if (propCategories && propCategories.length > 0) return;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await getUserCategories(session.user.id);
        if (res.data && Array.isArray(res.data)) setCategories(res.data);
      } catch (err) {
        console.error('Error cargando categorías en modal:', err);
      }
    };
    load();
  }, [showModal, propCategories]);

  return (
    <div>
      {showModal
        && createPortal(<Modal categories={categories} onClose={() => {
          blendy.current?.untoggle('modal-trasnaction', () => {
            setShowModal(false)
          })
        }}></Modal>, document.body)
      }
      <IconCircleButton
        data-blendy-from="modal-trasnaction"
        onClick={() => {
          setShowModal(true)
          blendy.current?.toggle('modal-trasnaction')
        }}
        ariaLabel="Agregar gasto"
        icon={<CiReceipt size={20} />}
        label="+ Gasto"
      />
    </div>
  )
}

function Modal({ onClose, categories }: { onClose: React.MouseEventHandler<HTMLElement>, categories: Category[] }) {
  return (
    <div className="modal z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to="modal-trasnaction">
      <div>
        <div className="modal__header border-b border-zinc-700">
          <h2 className="text-zinc-400">Agregar transacción</h2>
          <button className="modal__close" onClick={onClose}></button>
        </div>
        <div className="modal__content">
          {categories.length === 0 && <p className="text-zinc-400">No hay categorías disponibles. Por favor, crea una categoría primero.</p>}
          {categories.length > 0 && (
            <div>
              {categories.map((category) => (
                <div key={category.id} className="grid grid-cols-6 gap-2 mb-2">
                  <CategoryIcon iconName={category.icon ?? 'default'} color={category.color} size={40} className="border p-1 rounded-full inline-block mr-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
