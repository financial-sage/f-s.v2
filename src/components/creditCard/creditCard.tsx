"use client"

import styles from '@/scss/modules/creditCard.module.scss'
import { useTransactionContext } from '@/src/contexts/TransactionContext'
import { useCurrency } from '@/src/contexts/CurrencyContext'
import { useSession } from '@/src/hooks/useSession'
import { useMemo } from 'react'

export default function CreditCard() {
    const { transactions } = useTransactionContext()
    const { session } = useSession()
    const { formatAmount } = useCurrency()
    
    // Calcular saldo actual basado en transacciones
    const currentBalance = useMemo(() => {
        return transactions.reduce((total, transaction) => {
            if (transaction.status === 'completed') {
                return transaction.type === 'income' 
                    ? total + transaction.amount 
                    : total - transaction.amount
            }
            return total
        }, 0)
    }, [transactions])
    
    // Obtener fecha actual en formato MM/YY
    const currentDate = useMemo(() => {
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = String(now.getFullYear()).slice(-2)
        return `${month}/${year}`
    }, [])
    
    // Obtener nombre del usuario
    const userName = useMemo(() => {
        if (session?.user?.email) {
            // Usar la parte antes del @ del email y formatearla como nombre
            const emailName = session.user.full_name
            // Reemplazar puntos y guiones bajos con espacios y capitalizar
            return emailName
        }
        return 'Usuario'
    }, [session])
    
    // Formatear saldo usando el contexto de moneda
    const formattedBalance = formatAmount(currentBalance)
    return (
        <div className={styles.creditCard}>
            {/* <div className={styles.circles}>
                <div className={`${styles.circle} ${styles.circle1}`}></div>
                <div className={`${styles.circle} ${styles.circle2}`}></div>
            </div> */}
            <div>
                <div className={`${styles.card} bg-white/10 dark:bg-gray-800/20 border-2 border-gray-200 dark:border-gray-600`}>
                    <div className={styles.logo}>
                        {/* <img src="https://raw.githubusercontent.com/dasShounak/freeUseImages/main/Visa-Logo-PNG-Image.png" alt="Logo" /> */}
                    </div>
                    <div className={styles.number}>Saldo Actual: {formattedBalance}</div>
                    <div className={styles.chip}>
                        <img src="https://raw.githubusercontent.com/dasShounak/freeUseImages/main/chip.png" alt="Chip" />
                    </div>
                    <div className={styles.name}>{userName}</div>
                    <div className={styles.to}>{currentDate}</div>
                    <div className={styles.ring}></div>
                </div>
            </div>
        </div>
    )
}