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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
        }} selectedCategoryId={selectedCategoryId} setSelectedCategoryId={setSelectedCategoryId} ></Modal>, document.body)
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

function Modal({ onClose, categories, selectedCategoryId, setSelectedCategoryId }: { onClose: React.MouseEventHandler<HTMLElement>, categories: Category[], selectedCategoryId: string | null, setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>> }) {
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
            <div className="grid md:grid-cols-6 lg:grid-cols-6 gap-4 dark:text-zinc-400">

              {categories.map((option) => {
                const isSelected = selectedCategoryId === option.id;
                return (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedCategoryId(option.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedCategoryId(option.id); } }}
                    className={`flex flex-col items-center dark:bg-white/5 dark:hover:bg-white/10 pt-2 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ borderColor: isSelected ? option.color : 'transparent', boxShadow: isSelected ? `0 0 0 6px ${option.color}22` : undefined }}
                    aria-pressed={isSelected}
                    aria-checked={isSelected}
                  >
                    <div className="text-2xl"><CategoryIcon iconName={option.icon ?? 'default'} color={option.color} /></div>
                    <div className="text-sm mt-1">{option.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
