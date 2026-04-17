"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Fuel,
  CarFront,
  UtensilsCrossed,
  User,
  Wallet,
  Wifi,
  X,
  Zap,
  type LucideIcon,
  Users,
} from "lucide-react";
import {
  saveExpenseAction,
  type ExpenseActor,
  type ExpenseCategory,
  type ExpenseResponsibleFor,
} from "@/app/actions/expenses";
import { editExpenseAction } from "@/app/actions/editExpense";
import CustomKeypad from "@/components/CustomNumpad";
import type { ExpenseToEdit } from "@/components/ExpenseModalProvider";
import { createClient } from "@/utils/supabase/client";

interface AddExpenseFormProps {
  familyMemberCount?: number;
  partnerFirstName?: string;
  onClose?: () => void;
  expenseToEdit?: ExpenseToEdit | null;
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

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

function buildPaidByOptions(partnerLabel: string): OptionItem<ExpenseOrigin>[] {
  return [
    { value: "me", label: "Mi", icon: Wallet },
    { value: "partner", label: partnerLabel, icon: Heart },
    { value: "joint_fund", label: "Fondo Común", icon: Home },
    { value: "both_split", label: "Ambos", icon: Users },
  ];
}

function buildResponsibleOptions(partnerLabel: string): OptionItem<ExpenseResponsibleFor>[] {
  return [
    { value: "joint_fund", label: "Fondo Común", icon: Home },
    { value: "me", label: "Mío", icon: User },
    { value: "partner", label: partnerLabel, icon: Heart },
  ];
}

const topCategories: CategoryTile[] = [
  { id: "super", value: "super", label: "Super", icon: ShoppingCart },
  { id: "dining", value: "food", label: "Restaurante", icon: UtensilsCrossed },
  { id: "transport", value: "transport", label: "Transp", icon: CarFront },
  { id: "home", value: "home", label: "Hogar", icon: House },
  { id: "health", value: "other", label: "Salud", icon: Pill },
  { id: "work", value: "other", label: "Trabajo", icon: Briefcase },
  { id: "edu", value: "other", label: "Edu", icon: GraduationCap },
  { id: "gifts", value: "other", label: "Regalos", icon: Gift },
  { id: "pets", value: "other", label: "Mascotas", icon: PawPrint },
  { id: "fuel", value: "transport", label: "Gasolina", icon: Fuel }
];

const extraCategories: CategoryTile[] = [
  { id: "gym", value: "other", label: "Gimnasio", icon: Dumbbell },
  { id: "clothes", value: "other", label: "Ropa", icon: Shirt },
  { id: "travel", value: "transport", label: "Viajes", icon: Plane },
  { id: "cinema", value: "other", label: "Cine", icon: Film },
  { id: "games", value: "other", label: "Juegos", icon: Gamepad2 },
  { id: "music", value: "other", label: "Musica", icon: Music },
  { id: "coffee", value: "food", label: "Cafe", icon: Coffee },
  { id: "kids", value: "other", label: "Bebe", icon: Baby },
  { id: "books", value: "other", label: "Libros", icon: BookOpen },
  { id: "phone", value: "home", label: "Telefono", icon: Smartphone },
  { id: "wifi", value: "home", label: "Internet", icon: Wifi },
  { id: "energy", value: "home", label: "Energia", icon: Zap },
  { id: "water", value: "home", label: "Agua", icon: Droplets },
  { id: "bus", value: "transport", label: "Bus", icon: Bus },
  { id: "party", value: "other", label: "Fiesta", icon: PartyPopper },
  { id: "beauty", value: "other", label: "Belleza", icon: Scissors },
  { id: "doctor", value: "other", label: "Doctor", icon: Stethoscope },
  { id: "bike", value: "transport", label: "Bici", icon: Bike },
  { id: "misc", value: "other", label: "Varios", icon: Globe },
  { id: "luxury", value: "other", label: "Lujo", icon: Gem },
];

function getSelectorClasses(isSelected: boolean, disabled: boolean) {
  if (disabled) {
    return "bg-white text-slate-400 opacity-50";
  }

  return isSelected
    ? "border border-sage/20 bg-sage/20 text-[#3F593E] shadow-sm"
    : "border border-slate-100 shadow-sm bg-white/50 text-on-surface-variant hover:bg-surface-container-lowest";
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

function getCategoryIdFromValue(category?: string | null) {
  return [...topCategories, ...extraCategories].find((option) => option.value === category)?.id ?? "food";
}

export default function AddExpenseForm({
  familyMemberCount,
  partnerFirstName,
  onClose,
  expenseToEdit = null,
}: AddExpenseFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [resolvedFamilyMemberCount, setResolvedFamilyMemberCount] = useState<number>(familyMemberCount ?? 1);
  const [resolvedPartnerFirstName, setResolvedPartnerFirstName] = useState<string>(
    getFirstName(partnerFirstName)
  );
  const isSolo = resolvedFamilyMemberCount <= 1;
  const isCoupleMode = !isSolo;

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
  const [showKeypad, setShowKeypad] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let isCancelled = false;

    async function resolveFamilyContext() {
      if (typeof familyMemberCount === "number") {
        setResolvedFamilyMemberCount(familyMemberCount);
      }

      if (partnerFirstName?.trim()) {
        setResolvedPartnerFirstName(getFirstName(partnerFirstName));
      }

      if (typeof familyMemberCount === "number" && partnerFirstName?.trim()) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isCancelled || !user) {
        if (typeof familyMemberCount !== "number") {
          setResolvedFamilyMemberCount(1);
        }
        if (!partnerFirstName?.trim()) {
          setResolvedPartnerFirstName("Mi pareja");
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled || !profile?.family_id) {
        if (typeof familyMemberCount !== "number") {
          setResolvedFamilyMemberCount(1);
        }
        if (!partnerFirstName?.trim()) {
          setResolvedPartnerFirstName("Mi pareja");
        }
        return;
      }

      if (typeof familyMemberCount !== "number") {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("family_id", profile.family_id);

        if (!isCancelled) {
          setResolvedFamilyMemberCount(count && count > 1 ? count : 1);
        }
      }

      if (partnerFirstName?.trim()) {
        return;
      }

      const { data: family } = await supabase
        .from("families")
        .select("user_1_id, user_2_id")
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .maybeSingle();

      if (isCancelled) {
        return;
      }

      const resolvedPartnerId =
        family?.user_1_id === user.id ? family.user_2_id : family?.user_1_id ?? null;

      if (!resolvedPartnerId) {
        setResolvedPartnerFirstName("Mi pareja");
        return;
      }

      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", resolvedPartnerId)
        .maybeSingle();

      if (!isCancelled) {
        setResolvedPartnerFirstName(getFirstName(partnerProfile?.full_name));
      }
    }

    void resolveFamilyContext();

    return () => {
      isCancelled = true;
    };
  }, [familyMemberCount, partnerFirstName, supabase]);

  useEffect(() => {
    if (expenseToEdit) {
      setAmount(Number(expenseToEdit.amount ?? 0));
      setConcept(expenseToEdit.concept ?? "");
      setSelectedCategory(getCategoryIdFromValue(expenseToEdit.category));
      setErrorMessage("");
      return;
    }

    setAmount(0);
    setConcept("");
    setPaidBy(isCoupleMode ? "me" : "me");
    setResponsibleFor(isCoupleMode ? "joint_fund" : "me");
    setMyContribution("");
    setPartnerContribution("");
    setSelectedCategory("food");
    setDate(new Date().toISOString().slice(0, 10));
    setErrorMessage("");
  }, [expenseToEdit, isCoupleMode]);

  function openCategorySheet() {
    setIsExpanded(false);
    setIsCategorySheetOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsSheetAnimated(true)));
  }

  function closeCategorySheet() {
    setIsSheetAnimated(false);
    setTimeout(() => {
      setIsCategorySheetOpen(false);
      setIsExpanded(false);
    }, 450);
  }

  const displayDate = useMemo(() => formatDisplayDate(date), [date]);
  const paidByOptions = useMemo(
    () => buildPaidByOptions(resolvedPartnerFirstName),
    [resolvedPartnerFirstName]
  );
  const responsibleOptions = useMemo(
    () => buildResponsibleOptions(resolvedPartnerFirstName),
    [resolvedPartnerFirstName]
  );
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

      if (expenseToEdit) {
        await editExpenseAction(expenseToEdit.id, amount, concept);
      } else {
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
      }

      if (onClose) {
        onClose();
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-dvh flex-col bg-transparent text-slate-800">
      {/* <header className="sticky top-0 z-50 w-full bg-transparent">
        <div className="flex w-full items-center justify-between px-4 py-4">
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
      </header> */}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 bg-transparent">
        <section className="px-1 pt-2">
          <h1 className="text-lg font-bold text-slate-800">
            {expenseToEdit ? "Editar Gasto" : "Nuevo Gasto"}
          </h1>
          <p className="text-sm text-slate-500">
            {expenseToEdit ? "Actualiza el movimiento seleccionado." : "Registra un nuevo movimiento."}
          </p>
        </section>

        <section className="mt-2 flex flex-col items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Importe del gasto
            </span>
            <div className="mt-2 flex items-center justify-center">
              <span className="text-sage text-4xl font-extrabold">$</span>
              <button
                type="button"
                onClick={() => setShowKeypad(true)}
                className="w-full border-none bg-transparent text-center text-5xl font-extrabold text-slate-800 outline-none"
              >
                {amount === 0 ? (
                  <span className="text-slate-300">0.00</span>
                ) : (
                  amount.toFixed(2)
                )}
              </button>
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

        {!isSolo && (
          <>
            <section className="px-1 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
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
                      className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
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
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{resolvedPartnerFirstName} puso</label>
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
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

        <div className="mt-4 flex flex-col rounded-2xl bg-white shadow-sm">
          <button
            type="button"
            onClick={openCategorySheet}
            className="bg-transparent p-4 flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-on-surface">Categoria</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <SelectedCategoryIcon size={18} className="text-primary" />
              {selectedCategoryItem.label}
            </span>
          </button>

          <div className="h-px w-full bg-slate-100" />

          <label
            htmlFor="expense-date"
            className="bg-transparent p-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="text-sage flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <CalendarDays size={18} />
              </div>
              <span className="text-sm font-semibold capitalize text-slate-800">{displayDate}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-[#4A6549]">
              Cambiar
            </span>
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
          />
        </div>

       

        {errorMessage && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-transparent p-4 backdrop-blur-md">
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
          {isSaving ? (expenseToEdit ? "Actualizando..." : "Guardando...") : (expenseToEdit ? "Actualizar" : "Guardar")}
        </button>
      </footer>

      {isCategorySheetOpen && mounted && createPortal(
        <div className="fixed inset-0 z-90 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isSheetAnimated ? "opacity-100" : "opacity-0"}`}
            onClick={closeCategorySheet}
          />
          <div className={`relative bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-on-surface/10" />
            <span className="mb-4 block text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              CATEGORIA
            </span>
            <div className="mt-4 flex flex-col gap-6">
              {/* Top categories */}
              <div className="grid grid-cols-5 gap-y-6 gap-x-2">
                {topCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      closeCategorySheet();
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
              </div>

              {/* Extra categories — smooth height + opacity transition */}
              <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}>
                <div className="overflow-hidden">
                  <div className={`grid grid-cols-5 gap-y-6 gap-x-2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
                  }`}>
                    {extraCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          closeCategorySheet();
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
                  </div>
                </div>
              </div>

              {/* "Otros" toggle — always at the bottom */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded
                      ? "bg-slate-800 text-white shadow-md rotate-90 scale-105"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}>
                    {isExpanded ? <X size={20} strokeWidth={2} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
                  </div>
                  <span className={`text-[9px] font-medium transition-colors duration-300 ${isExpanded ? "text-slate-800 font-bold" : "text-slate-500"}`}>
                    {isExpanded ? "Cerrar" : "Otros"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Teclado Personalizado Overlay */}
      {showKeypad && (
        <div className="fixed inset-x-0 bottom-0 z-60 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-end px-6 pt-4 pb-2">
            <button type="button" onClick={() => setShowKeypad(false)} className="text-[10px] font-bold uppercase tracking-widest text-[#60855c] bg-[#60855c]/10 px-4 py-2 rounded-full">
              X
            </button>
          </div>
          <div >
            <CustomKeypad
              isOpen={showKeypad}
              embedded
              initialValue={amount ? String(amount) : "0"}
              onClose={() => setShowKeypad(false)}
              onValueChange={(value) => setAmount(Number(value) || 0)}
              onConfirm={() => setShowKeypad(false)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
