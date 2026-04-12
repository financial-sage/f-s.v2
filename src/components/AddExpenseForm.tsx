"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Heart,
  Home,
  House,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  ShoppingCart,
  Soup,
  CarFront,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  saveExpenseAction,
  type ExpenseActor,
  type ExpenseCategory,
  type ExpenseResponsibleFor,
} from "@/app/actions/expenses";
import CustomNumpad from "@/components/CustomNumpad";

interface AddExpenseFormProps {
  familyMemberCount: number;
}

interface OptionItem<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

const paidByOptions: OptionItem<ExpenseActor>[] = [
  { value: "me", label: "Mi cuenta", icon: Wallet },
  { value: "partner", label: "Mi pareja", icon: Heart },
  { value: "joint_fund", label: "Fondo Común", icon: Home },
];

const responsibleOptions: OptionItem<ExpenseResponsibleFor>[] = [
  { value: "joint_fund", label: "Fondo Común", icon: Home },
  { value: "me", label: "Mío", icon: User },
  { value: "partner", label: "De mi pareja", icon: Heart },
];

const categoryOptions: OptionItem<ExpenseCategory>[] = [
  { value: "super", label: "Super", icon: ShoppingCart },
  { value: "food", label: "Comida", icon: Soup },
  { value: "transport", label: "Transp", icon: CarFront },
  { value: "home", label: "Hogar", icon: House },
  { value: "other", label: "Otros", icon: MoreHorizontal },
];

function getSelectorClasses(isSelected: boolean, disabled: boolean) {
  if (disabled) {
    return "bg-white text-slate-400 opacity-50";
  }

  return isSelected
    ? "border border-[#8BA888]/20 bg-[#C1E1C1] text-[#4A6549] shadow-sm"
    : "bg-white text-slate-600 hover:bg-slate-100";
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Selecciona una fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

export default function AddExpenseForm({ familyMemberCount }: AddExpenseFormProps) {
  const router = useRouter();
  const isCoupleMode = familyMemberCount > 1;

  const [amount, setAmount] = useState<number>(0);
  const [concept, setConcept] = useState("");
  const [paidBy, setPaidBy] = useState<ExpenseActor>(isCoupleMode ? "joint_fund" : "me");
  const [responsibleFor, setResponsibleFor] = useState<ExpenseResponsibleFor>(
    isCoupleMode ? "joint_fund" : "me"
  );
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const displayDate = useMemo(() => formatDisplayDate(date), [date]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!amount || amount <= 0) {
      setErrorMessage("Ingresa un importe válido.");
      return;
    }

    if (!concept.trim()) {
      setErrorMessage("Escribe en qué gastaste.");
      return;
    }

    try {
      setIsSaving(true);

      await saveExpenseAction({
        amount,
        concept,
        paidBy: isCoupleMode ? paidBy : "me",
        responsibleFor: isCoupleMode ? responsibleFor : "me",
        category,
        date,
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-50 w-full bg-slate-50">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#4A6549] transition-colors hover:bg-slate-100"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-slate-800">Añadir Gasto</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 bg-slate-50 p-3">
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Importe del gasto
            </span>
            <div className="mt-2 flex items-center justify-center">
              <span className="text-sage text-4xl font-extrabold">$</span>
              <input
                type="text"
                readOnly={true}
                inputMode="none"
                value={amount === 0 ? "" : amount}
                onClick={() => setIsNumpadOpen(true)}
                placeholder="0.00"
                onFocus={(e) => e.target.blur()}
                className="w-full border-none bg-transparent text-center text-5xl font-extrabold text-slate-800 outline-none placeholder:text-slate-300 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex w-full items-center gap-3 border-t border-slate-100 pt-4">
            <PencilLine size={16} className="text-slate-400" />
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="¿En qué gastaste?"
              className="focus:outline-none w-full border-none bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-0"
            />
          </div>
        </section>

        {isCoupleMode && (
          <>
            <section className="px-1">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-tight text-slate-500">
                ¿De dónde salió el dinero?
              </h2>
              <div className="flex gap-2">
                {paidByOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = paidBy === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaidBy(value)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="px-1">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-tight text-slate-500">
                ¿Para qué se destinó?
              </h2>
              <div className="flex gap-2">
                {responsibleOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = responsibleFor === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setResponsibleFor(value)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="px-1 py-2">
          <div className="flex items-center justify-between px-1">
            {categoryOptions.map(({ value, label, icon: Icon }) => {
              const isSelected = category === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "border border-sage/20 bg-[#C1E1C1] text-[#4A6549] shadow-sm"
                        : "bg-white text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      isSelected ? "text-[#4A6549]" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-sage flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays size={18} />
            </div>
            <span className="text-sm font-semibold capitalize text-slate-800">{displayDate}</span>
          </div>
          <label
            htmlFor="expense-date"
            className="cursor-pointer px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-[#4A6549]"
          >
            Cambiar
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
          />
        </section>

        <div className="relative mt-2 h-28 w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="receipts and a green calculator on a light desk"
            className="h-full w-full object-cover grayscale opacity-30 transition-all duration-700 hover:grayscale-0 hover:opacity-60"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO5W2Cz9JTLG9x5Ryn4We8P4DT0tQwVfVcWcscS9-4EVqH6Bc44j5F3Mz9UfJ2Islj1vZPOXycI1ZneK-f2zeS3BwqHFKYyvIR4NigV7oyl_VirLQl9rkB-89z-HthyzPgKxOEitlsM9yqcLJmY2kLXVhEZFmcF_hKBoRCWboS6SxHMZsmv2CQ7y5KwG-3Q7FNqcPybwTBUiX9TmMSiMy8cXa-2X7KZXD9nUIVyZMeS7CT8C_yVCuV-2yDiVrY_qS6yIRTQ_Igk21z"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-50 to-transparent opacity-60" />
        </div>

        {errorMessage && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-slate-50/80 p-4 backdrop-blur-md">
        <button
          type="submit"
          disabled={isSaving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sage font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {isSaving ? "Guardando..." : "Guardar Gasto"}
        </button>
      </footer>

      <CustomNumpad
        isOpen={isNumpadOpen}
        initialValue={amount ? String(amount) : "0"}
        onClose={() => setIsNumpadOpen(false)}
        onValueChange={(value) => setAmount(Number(value) || 0)}
        onConfirm={() => setIsNumpadOpen(false)}
      />
    </form>
  );
}
