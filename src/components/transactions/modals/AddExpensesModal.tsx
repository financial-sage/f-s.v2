import { useState, useRef, useEffect } from 'react';
import { Blendy, createBlendy } from 'blendy';
import IconCircleButton from '@/src/components/common/IconCircleButton';
import { GiPayMoney, GiReceiveMoney } from 'react-icons/gi';
import TransactionFormModal from './TransactionFormModal';
import QuickTransactionModal from './QuickTransactionModal';

interface AccountTransactionModalProps {
  accountId: string;
  type?: 'expense' | 'income';
  preselectedAccountId?: string;
  onTransactionSaved?: () => void;
  onTransactionComplete?: () => void;
  onAccountChange?: (newAccountId: string) => void;
}

export default function AccountTransactionModal({ 
  accountId, 
  type = 'expense',
  preselectedAccountId,
  onTransactionSaved, 
  onTransactionComplete,
  onAccountChange
}: AccountTransactionModalProps) {
  const blendy = useRef<Blendy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' });
  }, []);

  const handleClose = () => {
    setShowModal(false);
  };

  const handleOpen = () => {
    setShowModal(true);
  };

  return (
    <div>
      {/* Nuevo enfoque rápido para gastos */}
      {isMobile ? (
        <QuickTransactionModal
          isOpen={showModal}
          onClose={handleClose}
          mode="add"
          type={type}
          accountId={accountId}
          preselectedAccountId={preselectedAccountId}
          onSaved={onTransactionSaved}
          onTransactionComplete={onTransactionComplete}
          onAccountChange={onAccountChange}
        />
      ) : (
        <TransactionFormModal
          isOpen={showModal}
          onClose={handleClose}
          mode="add"
          type={type}
          accountId={accountId}
          preselectedAccountId={preselectedAccountId}
          onSaved={onTransactionSaved}
          onTransactionComplete={onTransactionComplete}
          onAccountChange={onAccountChange}
        />
      )}
      <IconCircleButton
        data-blendy-from={`modal-transaction-${type}`}
        onClick={handleOpen}
        ariaLabel={`Agregar ${type === 'expense' ? 'gasto' : 'ingreso'}`}
        icon={type === 'expense' ? <GiPayMoney size={20} color="#f59e0b" /> : <GiReceiveMoney size={20} color="#4cbc3c" />}
        label={type === 'expense' ? '+ Gasto' : '+ Ingreso'}
      />
    </div>
  );
}
