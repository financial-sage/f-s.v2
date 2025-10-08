import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Blendy, createBlendy } from "blendy";
import { Category, getUserCategories } from "@/src/lib/supabase/categories";
import { supabase } from '@/src/lib/supabase/client';
import { addTransaction, NewTransaction, getCategoryExpenses } from "@/src/lib/supabase/transactions";
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
  const [categories, setCategories] = useState<Category[]>((propCategories || []).filter(c => c.type === 'expense'));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});

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

  // Cargar totales gastados por categoría cuando se abre el modal
  useEffect(() => {
    if (!showModal) return;
    const loadExpenses = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await getCategoryExpenses(session.user.id);
        if (!res.error && res.data) setCategoryExpenses(res.data);
      } catch (err) {
        console.error('Error cargando gastos por categoría:', err);
      }
    };
    loadExpenses();
  }, [showModal]);

  return (
    <div>
      {showModal
        && createPortal(<Modal categories={categories} onClose={() => {
          blendy.current?.untoggle('modal-trasnaction', () => {
            setShowModal(false)
          })
        }} selectedCategoryId={selectedCategoryId} setSelectedCategoryId={setSelectedCategoryId} categoryExpenses={categoryExpenses} />, document.body)
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

function Modal({ onClose, categories, selectedCategoryId, setSelectedCategoryId, categoryExpenses }: { onClose: React.MouseEventHandler<HTMLElement>, categories: Category[], selectedCategoryId: string | null, setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>, categoryExpenses: Record<string, number> }) {

  // Helper: convierte hex a rgba con alpha
  const hexToRgba = (hex: string, alpha = 1) => {
    try {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return `rgba(99,102,241,${alpha})`; // fallback purple
    }
  };

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

              {categories.filter(c => c.type === 'expense').map((option) => {
                const isSelected = selectedCategoryId === option.id;

                // spent vs limit
                const spent = categoryExpenses[option.id] || 0;
                const limit = option.budget_limit || 0;
                const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

                return (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedCategoryId(option.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedCategoryId(option.id); } }}
                    className={`relative overflow-hidden flex flex-col items-center dark:bg-white/5 dark:hover:bg-white/10 pt-2 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ borderColor: isSelected ? option.color : 'transparent', boxShadow: isSelected ? `0 0 0 6px ${option.color}22` : undefined }}
                    aria-pressed={isSelected}
                    aria-checked={isSelected}
                  >
                    {/* Background soft layer */}
                    <div style={{ position: 'absolute', inset: 0, background: hexToRgba(option.color, 0.06), pointerEvents: 'none' }}></div>

                    {/* Spent layer from bottom up */}
                    {limit > 0 && (
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${percent}%`, background: hexToRgba(option.color, 0.28), pointerEvents: 'none', transition: 'height 300ms ease' }} />
                    )}

                    <div className="text-2xl relative z-10"><CategoryIcon iconName={option.icon ?? 'default'} color={option.color} /></div>
                    <div className="text-sm mt-1 relative z-10">{option.name}</div>
                    {/* {limit > 0 && (
                      <div className="text-xs mt-1 relative z-10 text-zinc-300">{`Gastado: ${spent} / ${limit} (${percent}%)`}</div>
                    )} */}
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
