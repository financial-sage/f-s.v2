import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Blendy, createBlendy } from "blendy";
import { Category, getUserCategories } from "@/src/lib/supabase/categories";
import { supabase } from '@/src/lib/supabase/client';
import { CiCreditCard1, CiCreditCard2, } from "react-icons/ci";
import IconCircleButton from '@/src/components/common/IconCircleButton';
import { PiBankThin, PiChartLineUpLight, PiPiggyBankLight, PiWalletLight } from "react-icons/pi";
import { getUserAccounts, createAccount, updateAccount, deactivateAccount } from '@/src/lib/supabase/accounts';
import { Account, AccountType, NewAccount } from "@/src/types/types";
import { useSession } from "@/src/hooks/useSession";
import { LiaMoneyBillWaveAltSolid } from "react-icons/lia";
import { GiSmartphone } from "react-icons/gi";
import { Input, Select, CurrencyInput } from "../../common";
import { showError, showSuccess, showToast } from "@/src/utils/sweetAlert";

interface AccountTransactionModalProps {
    accountId: string;
    categories?: Category[];
    onSaved?: () => void;
}

const AccountTypeOptions = [
    { value: 'cash' as AccountType, label: 'Efectivo', icon: <LiaMoneyBillWaveAltSolid color="#4cbc3c" />, color: '#4cbc3c', iconClass: 'fa-money-bill-wave' },
    { value: 'bank_account' as AccountType, label: 'Banco', icon: <PiBankThin color="#6366f1" />, color: '#6366f1', iconClass: 'fa-university' },
    { value: 'debit_card' as AccountType, label: 'Tarjeta', icon: <CiCreditCard2 color="#10b981" />, color: '#10b981', iconClass: 'fa-credit-card' },
    { value: 'digital_wallet' as AccountType, label: 'Digital', icon: <GiSmartphone color="#f59e0b" />, color: '#f59e0b', iconClass: 'fa-mobile-alt' },
    { value: 'savings' as AccountType, label: 'Ahorros', icon: <PiPiggyBankLight color="#ef4444" />, color: '#ef4444', iconClass: 'fa-piggy-bank' },
    { value: 'investments' as AccountType, label: 'Inversiones', icon: <PiChartLineUpLight color="#8b5cf6" />, color: '#8b5cf6', iconClass: 'fa-chart-line' }
];

const monedas = [
    { value: 'USD', label: 'USD - Dólar estadounidense' },
    { value: 'COP', label: 'COP - Peso Colombiano' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - Libra esterlina' }
];

export default function AddAccountModal({ accountId, categories: propCategories, onSaved }: AccountTransactionModalProps) {
    const blendy = useRef<Blendy | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState<NewAccount>({
        name: '',
        type: 'cash',
        balance: 0,
        currency: 'USD',
        color: '#6366f1',
        is_default: false
    });
    const [categories, setCategories] = useState<Category[]>(propCategories || []);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { session } = useSession();


    useEffect(() => {
        blendy.current = createBlendy({ animation: 'dynamic' })
    }, [])


    const loadAccounts = async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);
            const result = await getUserAccounts(session.user.id);
            if (result.error) {
                showError(result.error.message, 'Error al cargar cuentas');
            } else {
                setAccounts(result.data as Account[] || []);
            }
        } catch (error) {
            showError('Error al cargar las cuentas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [session?.user?.id]);

    const initialForm: NewAccount = {
        name: '',
        type: 'cash',
        balance: 0,
        currency: 'USD',
        color: '#6366f1',
        is_default: false
    };

    const handleSave = async () => {
        if (!session?.user?.id) {
            showError('No se encontró la sesión del usuario.', 'Error de sesión');
            return;
        }

        try {
            setLoading(true);
            const result = await createAccount(session.user.id, formData);
            if (result.error) {
                showError(result.error.message, 'Error al crear cuenta');
                return;
            }
            // Solo guardar: cerramos el modal y reiniciamos el formulario localmente
            setShowModal(false);
            setFormData(initialForm);
            showToast('Cuenta guardada correctamente', 'success');
            // Notify parent to refresh accounts list if provided
            if (typeof onSaved === 'function') onSaved();
        } catch (err) {
            console.error(err);
            showError('Error al guardar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {showModal
                && createPortal(<Modal categories={categories} onClose={() => {
                    setShowModal(false);
                }} formData={formData} setFormData={setFormData} onSave={handleSave} />, document.body)
            }
            <IconCircleButton
                data-blendy-from="modal-addAccount"
                onClick={() => {
                    setShowModal(true);
                }}
                ariaLabel="Agregar cuenta"
                icon={<CiCreditCard1 size={20} color="#6366f1" />}
                label="+ Cuenta"
            />
        </div>
    )
}

function Modal({ onClose, categories, formData, setFormData, onSave }: { onClose: React.MouseEventHandler<HTMLElement>, categories: Category[], formData: NewAccount, setFormData: React.Dispatch<React.SetStateAction<NewAccount>>, onSave: () => Promise<void> }) {
    const [selectedAccountType, setSelectedAccountType] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedAccountType) {
            setError('Por favor selecciona un tipo de cuenta');
            return;
        }

        if (!formData.name.trim()) {
            setError('Por favor ingresa un nombre para la cuenta');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onSave();
            // Cerrar el modal después de guardar exitosamente
            const closeEvent = onClose as unknown as () => void;
            closeEvent();
        } catch (err) {
            setError('Error al guardar la cuenta');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-60 lg:z-40" suppressHydrationWarning>
          <div className="modal z-60 lg:z-50 border border-zinc-700 flex flex-col max-h-[calc(100vh-4rem)] lg:max-h-[90vh]" style={{ background: "var(--background-gradient)" }} data-blendy-to="modal-add-account" suppressHydrationWarning>
                <div className="modal__header border-b border-zinc-700 flex-shrink-0">
                    <h2 className="text-zinc-400">Agregar cuenta</h2>
                    <button className="modal__close" onClick={onClose}></button>
                </div>
                <div className="modal__content flex-1 overflow-y-auto pb-24 lg:pb-6">
                    {/* Tipos de cuenta */}
                       <label>Seleccione el tipo de cuenta que desea crear.</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-1.5 sm:gap-2 dark:text-zinc-400 m-2">
                       
                        {AccountTypeOptions.map((option) => {
                            const isSelected = selectedAccountType === option.value;
                            return (
                                <div
                                    key={option.value}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => { 
                                        setSelectedAccountType(option.value); 
                                        setFormData({ ...formData, type: option.value, color: option.color, icon: option.iconClass }); 
                                    }}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter' || e.key === ' ') { 
                                            setSelectedAccountType(option.value); 
                                            setFormData({ ...formData, type: option.value, color: option.color, icon: option.iconClass }); 
                                        } 
                                    }}
                                    className={`relative overflow-hidden flex flex-col items-center p-2 sm:p-3 rounded-lg cursor-pointer border transition-all ${
                                        isSelected 
                                            ? 'bg-zinc-800/50 border-zinc-600' 
                                            : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                                    }`}
                                    aria-pressed={isSelected}
                                    suppressHydrationWarning
                                >
                                    {/* Borde superior con color cuando está seleccionado */}
                                    {isSelected && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '2px',
                                                background: option.color,
                                                pointerEvents: 'none',
                                            }}
                                        ></div>
                                    )}
                                    <div className="text-xl sm:text-2xl relative z-10 transition-all">
                                        {option.icon}
                                    </div>
                                    <div className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 relative z-10 transition-colors text-center leading-tight ${
                                        isSelected ? 'text-zinc-200' : 'text-zinc-500'
                                    }`}>
                                        {option.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4 space-y-3">
                        {error && (
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Nombre de la cuenta */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-zinc-400">Nombre de la cuenta *</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Cuenta principal"
                                    required
                                    autoFocus
                                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                                />
                            </div>

                            {/* Campos específicos para bancos y tarjetas */}
                            {(formData.type === 'bank_account' || formData.type === 'credit_card' || formData.type === 'debit_card') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-zinc-400">Nombre del banco</label>
                                        <input
                                            type="text"
                                            value={formData.bank_name || ''}
                                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            placeholder="Ej. BBVA"
                                            className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-zinc-400">
                                            Últimos 4 dígitos <span className="text-zinc-600">(Opcional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.last_four_digits || ''}
                                            onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value })}
                                            placeholder="1234"
                                            maxLength={4}
                                            className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Saldo inicial */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-zinc-400">Saldo inicial *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.balance === 0 ? '' : String(formData.balance)}
                                    onChange={(e) => setFormData({ ...formData, balance: e.target.value === '' ? 0 : Number(e.target.value) })}
                                    placeholder="0.00"
                                    required
                                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Botones - Fixed footer */}
                <div className="border-t border-zinc-700 p-4 sm:p-6 bg-zinc-900/30 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedAccountType}
                            className={`py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm ${
                                isSubmitting || !selectedAccountType
                                    ? 'bg-zinc-600/20 cursor-not-allowed opacity-60'
                                    : 'bg-blue-500/30 hover:bg-blue-500/40 active:bg-blue-500/50'
                            }`}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Cuenta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
