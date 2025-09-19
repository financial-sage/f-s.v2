"use client";

import { AccountCard, AccountManagement } from "@/src/components/accounts";
import BlendyButton from "@/src/components/modal/blendy";
import TransferForm from "@/src/components/transactions/TransferForm";

export default function AccountsPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 dark:text-white" style={{fontWeight: "200"}}>Gestion de cuentas!</h1>
           
            <AccountManagement />
        </div>
    );
}
