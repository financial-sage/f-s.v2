"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Baby,
  Bike,
  Briefcase,
  BookOpen,
  Bolt,
  Bus,
  CalendarDays,
  Coffee,
  CheckCircle2,
  Dumbbell,
  Droplets,
  Film,
  Gamepad2,
  Gem,
  Globe,
  GraduationCap,
  Gift,
  Heart,
  Home,
  House,
  LoaderCircle,
  Music,
  MoreHorizontal,
  PawPrint,
  PartyPopper,
  PencilLine,
  Plane,
  Pill,
  Scissors,
  ShoppingCart,
  Shirt,
  Smartphone,
  Stethoscope,
  Soup,
  CarFront,
  UtensilsCrossed,
  User,
  Wallet,
  Wifi,
  X,
  type LucideIcon,
  Users,
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

interface CategoryTile {
  id: string;
  label: string;
  icon: LucideIcon;
  value: ExpenseCategory;
}

type ExpenseOrigin = ExpenseActor | "both_split";

const paidByOptions: OptionItem<ExpenseOrigin>[] = [
  { value: "me", label: "Mi", icon: Wallet },
  { value: "partner", label: "Mi pareja", icon: Heart },
  { value: "joint_fund", label: "Fondo Común", icon: Home },
  { value: "both_split", label: "Ambos", icon: Users },
];

const responsibleOptions: OptionItem<ExpenseResponsibleFor>[] = [
  { value: "joint_fund", label: "Fondo Común", icon: Home },
  { value: "me", label: "Mío", icon: User },
  { value: "partner", label: "De mi pareja", icon: Heart },
];

const topCategories: CategoryTile[] = [
  { id: "super", value: "super", label: "Super", icon: ShoppingCart },
  { id: "dining", value: "other", label: "Restaurante", icon: UtensilsCrossed },
  { id: "transport", value: "transport", label: "Transp", icon: CarFront },
  { id: "home", value: "home", label: "Hogar", icon: House },
  { id: "health", value: "other", label: "Salud", icon: Pill },
  { id: "work", value: "other", label: "Trabajo", icon: Briefcase },
  { id: "edu", value: "other", label: "Edu", icon: GraduationCap },
  { id: "gifts", value: "other", label: "Regalos", icon: Gift },
  { id: "pets", value: "other", label: "Mascotas", icon: PawPrint },
];

const extraCategories: CategoryTile[] = [
  { id: "gym", value: "other", label: "Gimnasio", icon: Dumbbell },
  { id: "clothes", value: "other", label: "Ropa", icon: Shirt },
  { id: "travel", value: "other", label: "Viajes", icon: Plane },
  { id: "cinema", value: "other", label: "Cine", icon: Film },
  { id: "games", value: "other", label: "Juegos", icon: Gamepad2 },
  { id: "music", value: "other", label: "Musica", icon: Music },
  { id: "coffee", value: "other", label: "Cafe", icon: Coffee },
  { id: "kids", value: "other", label: "Bebe", icon: Baby },
  { id: "books", value: "other", label: "Libros", icon: BookOpen },
  { id: "phone", value: "other", label: "Telefono", icon: Smartphone },
  { id: "wifi", value: "other", label: "Internet", icon: Wifi },
  { id: "energy", value: "other", label: "Energia", icon: Bolt },
  { id: "water", value: "other", label: "Agua", icon: Droplets },
  { id: "bus", value: "other", label: "Bus", icon: Bus },
  { id: "party", value: "other", label: "Fiesta", icon: PartyPopper },
  { id: "beauty", value: "other", label: "Belleza", icon: Scissors },
  { id: "doctor", value: "other", label: "Doctor", icon: Stethoscope },
  { id: "bike", value: "other", label: "Bici", icon: Bike },
  { id: "misc", value: "other", label: "Varios", icon: Globe },
  { id: "luxury", value: "other", label: "Lujo", icon: Gem },
];

function getSelectorClasses(isSelected: boolean, disabled: boolean) {
  if (disabled) {
    return "bg-white text-slate-400 opacity-50";
  }

  return isSelected
    ? "border border-sage/20 bg-sage/20 text-[#3F593E] shadow-sm"
    : "border border-slate-400 bg-transparent text-on-surface-variant hover:bg-surface-container-lowest";
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
  const [paidBy, setPaidBy] = useState<ExpenseOrigin>(isCoupleMode ? "me" : "me");
  const [responsibleFor, setResponsibleFor] = useState<ExpenseResponsibleFor>(
    isCoupleMode ? "joint_fund" : "me"
  );
  const [myContribution, setMyContribution] = useState("");
  const [partnerContribution, setPartnerContribution] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("food");
  const [isExpanded, setIsExpanded] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const displayDate = useMemo(() => formatDisplayDate(date), [date]);
  const allCategories = [...topCategories, ...extraCategories];
  const selectedCategoryItem =
    allCategories.find((option) => option.id === selectedCategory) ?? topCategories[0];
  const selectedCategoryValue = selectedCategoryItem.value;
  const SelectedCategoryIcon = selectedCategoryItem.icon;

  function parseDecimal(value: string) {
    return Number(value.replace(/,/g, ".").trim());
  }

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

      if (paidBy === "joint_fund") {
        throw new Error("Gastar directamente desde Fondo Común aún no está soportado en este flujo.");
      }

      if (isCoupleMode && paidBy === "both_split") {
        const mine = parseDecimal(myContribution);
        const partner = parseDecimal(partnerContribution);

        if (!Number.isFinite(mine) || mine < 0 || !Number.isFinite(partner) || partner < 0) {
          throw new Error("Ingresa cuánto puso cada persona.");
        }

        if (Math.round((mine + partner) * 100) !== Math.round(amount * 100)) {
          throw new Error("La suma de ambos aportes debe coincidir con el monto total.");
        }

        const requests = [];

        if (mine > 0) {
          requests.push(
            saveExpenseAction({
              amount: mine,
              concept,
              paidBy: "me",
              responsibleFor,
              payerSharePct: 100,
              category: selectedCategoryValue,
              date,
              splitTypeOverride:
                responsibleFor === "joint_fund"
                  ? "fund_transfer"
                  : responsibleFor === "partner"
                    ? "p2p_debt"
                    : "personal",
            })
          );
        }

        if (partner > 0) {
          requests.push(
            saveExpenseAction({
              amount: partner,
              concept,
              paidBy: "partner",
              responsibleFor,
              payerSharePct: 100,
              category: selectedCategoryValue,
              date,
              splitTypeOverride:
                responsibleFor === "joint_fund"
                  ? "fund_transfer"
                  : responsibleFor === "me"
                    ? "p2p_debt"
                    : "personal",
            })
          );
        }

        await Promise.all(requests);
      } else {
        const singlePaidBy = (isCoupleMode ? paidBy : "me") as ExpenseActor;
        const splitTypeOverride =
          responsibleFor === "joint_fund"
            ? "fund_transfer"
            : responsibleFor === "partner" && singlePaidBy === "me"
              ? "p2p_debt"
              : responsibleFor === "me" && singlePaidBy === "partner"
                ? "p2p_debt"
                : "personal";

        await saveExpenseAction({
          amount,
          concept,
          paidBy: singlePaidBy,
          responsibleFor: isCoupleMode ? responsibleFor : "me",
          payerSharePct: 100,
          category: selectedCategoryValue,
          date,
          splitTypeOverride,
        });
      }

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
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 block">
                PAGADO POR
              </span>
              <div className="flex flex-wrap gap-2">
                {paidByOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = paidBy === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaidBy(value)}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {paidBy === "both_split" && (
                <div className="mt-3 flex gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">Tú pusiste</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={myContribution}
                        onChange={(e) => setMyContribution(e.target.value)}
                        className="w-full rounded-xl text-slate-800 bg-slate-200 py-2 pl-7 pr-3 outline-none border border-slate-400"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">Tu pareja puso</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={partnerContribution}
                        onChange={(e) => setPartnerContribution(e.target.value)}
                        className="w-full rounded-xl text-slate-800 bg-slate-200 py-2 pl-7 pr-3 outline-none border border-slate-400"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 block">
                DESTINO DEL GASTO
              </span>
              <div className="flex flex-wrap gap-2">
                {responsibleOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = responsibleFor === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setResponsibleFor(value)}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="px-1 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 block">
            CATEGORIA
          </span>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setIsCategorySheetOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-on-surface">Categoria:</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <SelectedCategoryIcon size={18} className="text-primary" />
              {selectedCategoryItem.label}
            </span>
          </button>
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

      {isCategorySheetOpen && (
        <div className="fixed inset-0 z-60">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsCategorySheetOpen(false);
              setIsExpanded(false);
            }}
          />
          <div className="absolute bottom-0 w-full rounded-t-3xl bg-white p-6 pb-10 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-on-surface/10" />
            <span className="mb-4 block text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              CATEGORIA
            </span>
            <div className="mt-4">
              <div className="grid grid-cols-5 gap-y-6 gap-x-2">
                {topCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCategorySheetOpen(false);
                      setIsExpanded(false);
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-sage/20 text-[#60855c] border-transparent"
                          : "bg-white border border-slate-300 text-slate-500"
                      }`}
                    >
                      <cat.icon size={20} strokeWidth={1.5} />
                    </div>
                    <span
                      className={`text-[9px] font-medium tracking-wide truncate w-full text-center ${
                        selectedCategory === cat.id ? "text-[#60855c] font-bold" : "text-slate-500"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                ))}

                {isExpanded &&
                  extraCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategorySheetOpen(false);
                        setIsExpanded(false);
                      }}
                      className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-6 duration-300"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                          selectedCategory === cat.id
                            ? "bg-sage/20 text-[#60855c] border-transparent"
                            : "bg-white border border-slate-300 text-slate-500"
                        }`}
                      >
                        <cat.icon size={20} strokeWidth={1.5} />
                      </div>
                      <span
                        className={`text-[9px] font-medium tracking-wide truncate w-full text-center ${
                          selectedCategory === cat.id ? "text-[#60855c] font-bold" : "text-slate-500"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                    isExpanded
                      ? "bg-slate-800 text-white shadow-md rotate-90 scale-105"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}>
                    {isExpanded ? <X size={20} strokeWidth={2} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
                  </div>
                  <span className={`text-[9px] font-medium transition-colors ${isExpanded ? "text-slate-800 font-bold" : "text-slate-500"}`}>
                    {isExpanded ? "Cerrar" : "Otros"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
