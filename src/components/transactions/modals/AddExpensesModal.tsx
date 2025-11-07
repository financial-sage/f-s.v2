import { useState, useRef, useEffect } from 'react';
import { Blendy, createBlendy } from 'blendy';
import IconCircleButton from '@/src/components/common/IconCircleButton';
import { GiPayMoney, GiReceiveMoney } from 'react-icons/gi';
import TransactionFormModal from './TransactionFormModal';

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

  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' });
  }, []);

  const handleClose = () => {
    blendy.current?.untoggle(`modal-transaction-${type}`, () => {
      setShowModal(false);
    });
  };

  const handleOpen = () => {
    setShowModal(true);
    blendy.current?.toggle(`modal-transaction-${type}`);
  };

  return (
    <div>
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
