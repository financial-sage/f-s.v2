 "use client";

 import { X } from "lucide-react";
 import CustomNumpad from "@/components/CustomNumpad";

 interface NumericKeypadSheetProps {
   isOpen: boolean;
   title?: string;
   initialValue?: string;
   showDisplay?: boolean;
   errorMessage?: string;
   onClose: () => void;
   onValueChange: (value: string) => void;
   onConfirm: (value?: string) => void;
 }

 export function NumericKeypadSheet({
   isOpen,
   title,
   initialValue,
   showDisplay = true,
   errorMessage,
   onClose,
   onValueChange,
   onConfirm,
 }: NumericKeypadSheetProps) {
   if (!isOpen) return null;

   return (
     <div className="fixed inset-0 z-60">
       <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm" onClick={onClose} />
       <div className="fixed inset-x-0 bottom-0 rounded-t-[2.5rem] bg-surface-lowest shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300">
         <div className="flex items-center justify-between px-6 pt-4 pb-2">
           <div className="min-w-10" />
           {title ? (
             <h4 className="text-[10px] font-bold tracking-widest text-outline-variant font-label">
               {title}
             </h4>
           ) : (
             <div />
           )}
           <button
             type="button"
             onClick={onClose}
             className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
             aria-label="Cerrar"
           >
             X
           </button>
         </div>

         {errorMessage ? (
           <div className="px-6 pb-2">
             <p className="rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700 shadow-sm border border-rose-100">
               {errorMessage}
             </p>
           </div>
         ) : null}

        <div className="px-0 pb-0">
           <CustomNumpad
             isOpen={isOpen}
             embedded
             embeddedStyle="flat"
             showDisplay={showDisplay}
             initialValue={initialValue || "0"}
             onClose={onClose}
             onValueChange={onValueChange}
             onConfirm={onConfirm}
           />
         </div>
       </div>
     </div>
   );
 }

