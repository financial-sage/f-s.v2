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
}

interface ModalProps {
    onClose: () => void;
    accounts: Account[];
    type: 'expense' | 'income';
    onAccountSelect?: (accountId: string) => void;
    currentAccountId?: string;
}

function Modal({ onClose, accounts, type, onAccountSelect, currentAccountId }: ModalProps) {
    const currencyContext = useContext(CurrencyContext);

    if (!currencyContext) {
        throw new Error('Currency context must be used within CurrencyProvider');
    }

    // Primero filtramos por tipo de cuenta y luego excluimos la cuenta actual
    const filteredAccounts = accounts
        .filter(acc => {
            // Filtrar por tipo de cuenta
            const typeFilter = type === 'expense'
                ? acc.type === 'bank_account' || acc.type === 'debit_card' || acc.type === 'cash'
                : true;

            // Excluir la cuenta actual
            const excludeCurrent = acc.id !== currentAccountId;

            return typeFilter && excludeCurrent;
        });

    const handleAccountSelect = (accountId: string) => {
        if (onAccountSelect) {
            onAccountSelect(accountId);
        }
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className="z-50 border rounded-lg border-zinc-700 top-0 bottom-0 left-0 right-0 fixed max-w-xs"
                style={{ background: "var(--background-gradient)", margin: 'auto', height: 'fit-content' }}
                data-blendy-to="modal-account-select">
                <div className="modal__header">
                    <h2 className="text-zinc-400">Cambiar Cuenta</h2>
                    <button className="modal__close" onClick={onClose}></button>
                </div>
                <div className="modal__content">
                    <div className="space-y-1">
                        {filteredAccounts.length === 0 ? (
                            <p className="text-zinc-400 text-center">No hay cuentas disponibles</p>
                        ) : (
                            filteredAccounts.map(account => (
                                <div
                                    key={account.id}
                                    className="hover:border hover:border-zinc-700 text-zinc-400 dark:bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
                                    onClick={() => handleAccountSelect(account.id)}
                                >
                                    <span className="flex items-center gap-2 p-2">
                                        <i
                                            style={{ color: account.color }}
                                            className={`fa ${account.icon} text-zinc-400 p-2 rounded-md`}
                                        />
                                        <span className="text-sm opacity-75">
                                            <b>{account.name}&nbsp;</b>
                                            ({currencyContext.formatAmount(account.balance)})
                                        </span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function AccountSelectorModal({ type = 'expense', onAccountSelect, currentAccountId }: AccountSelectorModalProps) {
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
