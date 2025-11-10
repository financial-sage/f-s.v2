import { Blendy, createBlendy } from "blendy"
import { useEffect, useRef, useState, useContext } from "react"
import IconCircleButton from "../../common/IconCircleButton";
import { MdOutlineChangeCircle } from "react-icons/md";
import { createPortal } from "react-dom";
import { supabase } from '@/src/lib/supabase/client';
import { getUserAccounts } from '@/src/lib/supabase/accounts';
import { Account } from '@/src/types/types';
import { CurrencyContext } from '@/src/contexts/CurrencyContext';
import { BsCurrencyExchange } from "react-icons/bs";
import { VscSync } from "react-icons/vsc";

interface AccountSelectorModalProps {
    type?: 'expense' | 'income';
    onAccountSelect?: (accountId: string) => void;
    currentAccountId?: string; // ID de la cuenta actualmente seleccionada
    onTransactionComplete?: () => void;
    showAllAccounts?: boolean; // Si es true, muestra todas las cuentas sin excluir la actual
}

interface ModalProps {
    onClose: () => void;
    accounts: Account[];
    type: 'expense' | 'income';
    onAccountSelect?: (accountId: string) => void;
    currentAccountId?: string;
    onTransactionComplete?: () => void;
    showAllAccounts?: boolean;
}

function Modal({ onClose, accounts, type, onAccountSelect, currentAccountId, onTransactionComplete, showAllAccounts = false }: ModalProps) {
    const currencyContext = useContext(CurrencyContext);

    if (!currencyContext) {
        throw new Error('Currency context must be used within CurrencyProvider');
    }

    // Primero filtramos por tipo de cuenta y luego excluimos la cuenta actual (si showAllAccounts es false)
    const filteredAccounts = accounts
        .filter(acc => {
            // Filtrar por tipo de cuenta
            const typeFilter = type === 'expense'
                ? acc.type === 'bank_account' || acc.type === 'debit_card' || acc.type === 'cash'
                : true;

            // Excluir la cuenta actual solo si showAllAccounts es false
            const excludeCurrent = showAllAccounts ? true : acc.id !== currentAccountId;

            return typeFilter && excludeCurrent;
        });

    const handleAccountSelect = (accountId: string) => {
        if (onAccountSelect) {
            onAccountSelect(accountId);
        }
        if (onTransactionComplete) {
            onTransactionComplete();
        }
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[70] lg:z-60" onClick={onClose}></div>
            <div 
                className="fixed z-[70] lg:z-[60] border rounded-lg border-zinc-700 w-[calc(100%-2rem)] sm:w-full max-w-md left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[70vh] flex flex-col"
                style={{ background: "var(--background-gradient)" }}
                data-blendy-to="modal-account-select">
                <div className="border-b border-zinc-700 p-4 sm:p-5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-medium text-zinc-200">Seleccionar Cuenta</h2>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800/50 transition-colors"
                        >
                            <i className="fas fa-times text-zinc-400"></i>
                        </button>
                    </div>
                </div>
                <div className="p-4 sm:p-5 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        {filteredAccounts.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fas fa-wallet text-4xl text-zinc-600 mb-3"></i>
                                <p className="text-zinc-400 text-sm">No hay cuentas disponibles</p>
                            </div>
                        ) : (
                            filteredAccounts.map(account => (
                                <button
                                    key={account.id}
                                    className="w-full relative group flex items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-600 active:scale-[0.98]"
                                    onClick={() => handleAccountSelect(account.id)}
                                >
                                    {/* Borde izquierdo con color de la cuenta */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all"
                                        style={{ background: account.color, opacity: 0.3 }}
                                    ></div>
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: account.color }}
                                    ></div>
                                    
                                    {/* Ícono de la cuenta */}
                                    <div 
                                        className="relative flex items-center justify-center w-12 h-12 rounded-lg transition-all"
                                        style={{ 
                                            background: `${account.color}15`,
                                        }}
                                    >
                                        <i
                                            className={`fa ${account.icon} text-xl transition-all`}
                                            style={{ color: account.color }}
                                        />
                                    </div>
                                    
                                    {/* Información de la cuenta */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-sm sm:text-base font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                                            {account.name}
                                        </div>
                                        <div className="text-xs sm:text-sm font-semibold text-zinc-400 group-hover:text-zinc-300 transition-colors mt-0.5">
                                            {currencyContext.formatAmount(account.balance)}
                                        </div>
                                    </div>
                                    
                                    {/* Flecha indicadora */}
                                    <i className="fas fa-chevron-right text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all text-xs flex-shrink-0"></i>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function AccountSelectorModal({ type = 'expense', onAccountSelect, currentAccountId, onTransactionComplete, showAllAccounts = false }: AccountSelectorModalProps) {
    const blendy = useRef<Blendy | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [accounts, setAccounts] = useState<Account[]>([])

    useEffect(() => {
        blendy.current = createBlendy({ animation: 'dynamic' })
    }, []);

    useEffect(() => {
        if (!showModal) return;

        const loadAccounts = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const result = await getUserAccounts(session.user.id);
                if (result.data && Array.isArray(result.data)) {
                    setAccounts(result.data as Account[]);
                }
            } catch (err) {
                console.error('Error cargando cuentas:', err);
            }
        };

        loadAccounts();
    }, [showModal]);

    const handleClose = () => {
        blendy.current?.untoggle('modal-account-select', () => {
            setShowModal(false)
        })
    };

    return (
        <div>
            {showModal && createPortal(
                <Modal
                    onClose={handleClose}
                    accounts={accounts}
                    type={type}
                    onAccountSelect={onAccountSelect}
                    currentAccountId={currentAccountId}
                    onTransactionComplete={onTransactionComplete}
                    showAllAccounts={showAllAccounts}
                />,
                document.body
            )}
            <IconCircleButton
                data-blendy-from="modal-account-select"
                onClick={() => {
                    setShowModal(true)
                    blendy.current?.toggle('modal-account-select')
                }}
                ariaLabel="Realizar transferencia"
                icon={<VscSync size={20} color="#F5AD18" />}
            />
        </div>
    );
}
