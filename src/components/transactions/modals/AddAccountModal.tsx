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
import { Input, Select } from "../../common";

interface AccountTransactionModalProps {
    accountId: string;
    categories?: Category[];
}

const AccountTypeOptions = [
    { value: 'cash' as AccountType, label: 'Efectivo', icon: <LiaMoneyBillWaveAltSolid color="#4cbc3c" />, color: '#4cbc3c' },
    { value: 'bank_account' as AccountType, label: 'Banco', icon: <PiBankThin color="#6366f1" />, color: '#6366f1' },
    { value: 'debit_card' as AccountType, label: 'Tarjeta', icon: <CiCreditCard2 color="#10b981" />, color: '#10b981' },
    { value: 'digital_wallet' as AccountType, label: 'Digital', icon: <GiSmartphone color="#f59e0b" />, color: '#f59e0b' },
    { value: 'savings' as AccountType, label: 'Ahorros', icon: <PiPiggyBankLight color="#ef4444" />, color: '#ef4444' },
    { value: 'investments' as AccountType, label: 'Inversiones', icon: <PiChartLineUpLight color="#8b5cf6" />, color: '#8b5cf6' }
];

const monedas = [
    { value: 'USD', label: 'USD - Dólar estadounidense' },
    { value: 'COP', label: 'COP - Peso Colombiano' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - Libra esterlina' }
];

export default function AddAccountModal({ accountId, categories: propCategories }: AccountTransactionModalProps) {
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
                alert(result.error.message);
            } else {
                setAccounts(result.data as Account[] || []);
            }
        } catch (error) {
            alert('Error al cargar las cuentas');
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
            alert('No se encontró la sesión del usuario.');
            return;
        }

        try {
            setLoading(true);
            const result = await createAccount(session.user.id, formData);
            if (result.error) {
                alert(result.error.message);
                return;
            }
            // Solo guardar: cerramos el modal y reiniciamos el formulario localmente
            blendy.current?.untoggle('modal-addAccount', () => {
                setShowModal(false);
            });
            setFormData(initialForm);
            alert('Cuenta guardada correctamente.');
        } catch (err) {
            console.error(err);
            alert('Error al guardar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {showModal
                && createPortal(<Modal categories={categories} onClose={() => {
                    blendy.current?.untoggle('modal-addAccount', () => {
                        setShowModal(false)
                    })
                }} formData={formData} setFormData={setFormData} onSave={handleSave} />, document.body)
            }
            <IconCircleButton
                data-blendy-from="modal-addAccount"
                onClick={() => {
                    setShowModal(true)
                    blendy.current?.toggle('modal-addAccount')
                }}
                ariaLabel="Agregar cuenta"
                icon={<CiCreditCard1 size={20} />}
                label="+ Cuenta"
            />
        </div>
    )
}

function Modal({ onClose, categories, formData, setFormData, onSave }: { onClose: React.MouseEventHandler<HTMLElement>, categories: Category[], formData: NewAccount, setFormData: React.Dispatch<React.SetStateAction<NewAccount>>, onSave: () => Promise<void> }) {
    // Estado local para la opción seleccionada
    const [selectedAccountType, setSelectedAccountType] = useState<string>('');

    return (
        <div className="modal z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to="modal-addAccount">
            <div>
                <div className="modal__header border-b border-zinc-700">
                    <h2 className="text-zinc-400">Agregar transacción</h2>
                    <button className="modal__close" onClick={onClose}></button>
                </div>
                <div className="modal__content ">

                    <div className="grid md:grid-cols-6 lg:grid-cols-6 gap-4 dark:text-zinc-400">
                        {AccountTypeOptions.map((option) => {
                            const isSelected = selectedAccountType === option.value;
                            return (
                                <div
                                    key={option.value}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => { setSelectedAccountType(option.value); setFormData({ ...formData, type: option.value, color: option.color}); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedAccountType(option.value); setFormData({ ...formData, type: option.value }); } }}
                                    className={`flex flex-col items-center dark:bg-white/5 dark:hover:bg-white/10 p-4 rounded-lg cursor-pointer border-2 transition-all`}
                                    style={{ borderColor: isSelected ? option.color : 'transparent', boxShadow: isSelected ? `0 0 0 6px ${option.color}22` : undefined }}
                                    aria-pressed={isSelected}
                                >
                                    <div className="text-2xl">{option.icon}</div>
                                    <div className="text-sm mt-1">{option.label}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div>
                        {/*  Cuenta seleccionada - Cuando se selecciona una cuenta de los iconos de arriba, se pone su nombre aquí */}
                        <small className="text-zinc-400">{selectedAccountType == '' ? 'Seleccione tipo de cuenta' : `Cuenta seleccionada: ${(AccountTypeOptions.find(o => o.value === selectedAccountType)?.label || selectedAccountType)}`}</small>
                    </div>
                    <div>
                        {/* Formulario para crear la cuenta */}
                        <div className="mt-4">
                            <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4 grid md:grid-cols-3 lg:grid-cols-3 gap-4">
                                <div className="md:col-span-2 lg:col-span-2">
                                    <label htmlFor="accountName" className="block text-sm font-medium text-zinc-400">Nombre de la cuenta</label>
                                    <Input
                                        label=""
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nombre cuenta"
                                    />
                                </div>

                                {/* input oculto eliminado: ahora el tipo se actualiza al seleccionar la tarjeta */}

                                <div className="md:col-span-2 lg:col-span-2">
                                    <label htmlFor="accountCurrency" className="block text-sm font-medium text-zinc-400">Moneda</label>
                                    <Select
                                        label=""
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        required
                                        className="text-sm"
                                        options={monedas.map((option) => ({
                                            value: option.value,
                                            label: option.label
                                        }))}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="initialBalance" className="block text-sm font-medium text-zinc-400">Saldo inicial</label>
                                    <Input
                                        label=""
                                        type="number"
                                        step="0.01"
                                        value={String(formData.balance)}
                                        onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="md:col-span-3 flex justify-end">
                                    <button type="submit" className="dark:bg-white/10">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
