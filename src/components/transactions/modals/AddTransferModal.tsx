import { Blendy, createBlendy } from "blendy";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconCircleButton from "../../common/IconCircleButton";
import { BiTransferAlt } from "react-icons/bi";
import { useSession } from "@/src/hooks/useSession";
import { getUserAccounts } from "@/src/lib/supabase/accounts";
import { Account } from "@/src/types/types";
import { createTransfer } from "@/src/lib/supabase/transactions";
import { useCurrency } from "@/src/contexts/CurrencyContext";

interface AddTransferModalProps {
  sourceAccountId?: string;
  onTransferComplete?: (destinationAccountId?: string) => void;
}

export default function AddTransferModal({ sourceAccountId, onTransferComplete }: AddTransferModalProps) {
  const blendy = useRef<Blendy | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' })
  }, []);


  return (
    <div>
      {showModal
        && createPortal(<Modal 
          sourceAccountId={sourceAccountId}
          onTransferComplete={onTransferComplete}
          onClose={() => {
            setShowModal(false);
          }}
        />, document.body)
      }
      <IconCircleButton
        data-blendy-from="modal-transfer"
        onClick={() => {
          setShowModal(true);
        }}
        ariaLabel="Realizar transferencia"
        icon={<BiTransferAlt size={20} color="#FFF" />}
        label="Transf."
      />
    </div>
  );
}

interface ModalProps {
  sourceAccountId?: string;
  onTransferComplete?: (destinationAccountId?: string) => void;
  onClose: React.MouseEventHandler<HTMLElement>;
}

function Modal({ sourceAccountId, onTransferComplete, onClose }: ModalProps) {
  const { session } = useSession();
  const { formatAmount } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Cargar cuentas
  useEffect(() => {
    const loadAccounts = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        const result = await getUserAccounts(session.user.id);
        if (result.error) {
          setError(result.error.message);
        } else {
          // Filtrar la cuenta de origen si existe
          const filteredAccounts = sourceAccountId 
            ? (result.data as Account[]).filter(acc => acc.id !== sourceAccountId && acc.id !== 'total-balance')
            : (result.data as Account[]).filter(acc => acc.id !== 'total-balance');
          setAccounts(filteredAccounts);
        }
      } catch (err) {
        setError('Error al cargar las cuentas');
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [session?.user?.id, sourceAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceAccountId) {
      setError('No se ha seleccionado cuenta de origen');
      return;
    }

    if (!selectedDestinationId) {
      setError('Por favor selecciona una cuenta de destino');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    if (sourceAccountId === selectedDestinationId) {
      setError('No puedes transferir a la misma cuenta');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const result = await createTransfer(
        session!.user!.id,
        sourceAccountId,
        selectedDestinationId,
        parseFloat(amount),
        description || 'Transferencia entre cuentas'
      );

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Resetear formulario
      setSelectedDestinationId('');
      setAmount('');
      setDescription('');
      
      // Disparar evento global para actualizar el dashboard
      window.dispatchEvent(new Event('dashboard:update'));
      
      // Notificar éxito y pasar el ID de la cuenta de destino
      if (onTransferComplete) {
        onTransferComplete(selectedDestinationId);
      }
      
      // Cerrar modal
      const closeEvent = onClose as unknown as () => void;
      closeEvent();
    } catch (err) {
      setError('Error al realizar la transferencia');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceAccount = accounts.find(acc => acc.id === sourceAccountId);
  const destinationAccount = accounts.find(acc => acc.id === selectedDestinationId);

  return (
    <div className="fixed inset-0 bg-black/70 z-60 lg:z-40" suppressHydrationWarning>
      <div className="modal z-60 lg:z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to="modal-transfer" suppressHydrationWarning>
        <div className="modal__header border-b border-zinc-700">
          <h2 className="text-zinc-400">Transferencia</h2>
          <button className="modal__close" onClick={onClose}></button>
        </div>
        <div className="modal__content">
          <form onSubmit={handleSubmit} className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4 space-y-3">
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-zinc-400">Cargando cuentas...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Cuenta de origen (si está definida) - Vista expandida */}
                {sourceAccount && (
                  <div className="relative overflow-hidden p-4 bg-gradient-to-br from-zinc-900/70 to-zinc-900/50 border border-zinc-700/50 rounded-xl">
                    {/* Franja de color superior */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: sourceAccount.color || '#6366f1' }}
                    />
                    
                    <div className="text-xs font-medium text-zinc-400 mb-3">Cuenta de origen</div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-lg"
                          style={{ backgroundColor: sourceAccount.color || '#6366f1' }}
                        >
                          <i className={`fas ${sourceAccount.icon || 'fa-wallet'} text-white`}></i>
                        </div>
                        <div>
                          <div className="text-base font-semibold text-zinc-100">{sourceAccount.name}</div>
                          {sourceAccount.bank_name && (
                            <div className="text-xs text-zinc-400 mt-0.5">{sourceAccount.bank_name}</div>
                          )}
                          {sourceAccount.last_four_digits && (
                            <div className="text-xs text-zinc-500 mt-0.5">•••• {sourceAccount.last_four_digits}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                      <span className="text-xs text-zinc-400">Saldo disponible</span>
                      <span className="text-lg font-bold text-zinc-100">
                        {formatAmount(sourceAccount.balance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Selector de cuenta destino en grid */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Selecciona cuenta de destino *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {accounts.length === 0 ? (
                      <div className="col-span-2 sm:col-span-3 text-center py-8 text-zinc-500 text-sm">
                        No hay cuentas disponibles para transferir
                      </div>
                    ) : (
                      accounts.map((account) => {
                        const isSelected = selectedDestinationId === account.id;
                        return (
                          <div
                            key={account.id}
                            onClick={() => setSelectedDestinationId(account.id)}
                            className={`relative overflow-hidden p-3 rounded-lg cursor-pointer border transition-all ${
                              isSelected 
                                ? 'bg-zinc-800/50 border-zinc-600 shadow-lg' 
                                : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                            }`}
                          >
                            {/* Borde superior con color cuando está seleccionado */}
                            {isSelected && (
                              <div
                                className="absolute top-0 left-0 right-0 h-0.5"
                                style={{ backgroundColor: account.color || '#6366f1' }}
                              />
                            )}
                            
                            <div className="flex flex-col items-center text-center gap-2">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0"
                                style={{ backgroundColor: account.color || '#6366f1' }}
                              >
                                <i className={`fas ${account.icon || 'fa-wallet'} text-white`}></i>
                              </div>
                              <div className="w-full min-w-0">
                                <div className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                                  {account.name}
                                </div>
                                {account.bank_name && (
                                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{account.bank_name}</div>
                                )}
                                <div className={`text-xs font-semibold mt-1 ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                                  {formatAmount(account.balance)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Monto */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Descripción <span className="text-zinc-600">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Pago de deuda, ahorro..."
                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                  />
                </div>

                {/* Resumen */}
                {sourceAccount && destinationAccount && amount && parseFloat(amount) > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="text-xs font-medium text-blue-400 mb-2">Resumen de transferencia</div>
                    <div className="space-y-1 text-xs text-zinc-300">
                      <div className="flex justify-between">
                        <span>Desde:</span>
                        <span className="font-medium">{sourceAccount.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hacia:</span>
                        <span className="font-medium">{destinationAccount.name}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-blue-500/20">
                        <span>Monto:</span>
                        <span className="font-medium text-blue-400">{formatAmount(parseFloat(amount))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting || !selectedDestinationId || !amount || parseFloat(amount) <= 0 || loading}
              className={`w-full py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm ${
                isSubmitting || !selectedDestinationId || !amount || parseFloat(amount) <= 0 || loading
                  ? 'bg-zinc-600/20 cursor-not-allowed opacity-60'
                  : 'bg-blue-500/30 hover:bg-blue-500/40 active:bg-blue-500/50'
              }`}
            >
              {isSubmitting ? 'Procesando...' : 'Realizar Transferencia'}
            </button>

            {/* Botón Cancelar solo en móviles */}
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-lg text-zinc-300 font-medium transition-all text-base bg-zinc-800/30 hover:bg-zinc-800/50 active:bg-zinc-800/60 border border-zinc-700 sm:hidden"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}