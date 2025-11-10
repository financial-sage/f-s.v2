"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import Link from "next/link";
import {
  ChartBar,
  Target,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Wallet,
  Smartphone,
  ShoppingCart,
  Landmark,
  BanknoteIcon
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const tips = [
    {
      icon: ChartBar,
      title: "Conoce tus ingresos y gastos",
      description: "El primer paso para el control financiero es saber exactamente cuánto ganas y en qué lo gastas. Registra todas tus transacciones.",
      color: "#3b82f6"
    },
    {
      icon: Target,
      title: "Establece metas financieras",
      description: "Define objetivos claros: ahorro para emergencias, vacaciones, o jubilación. Las metas concretas te mantienen motivado.",
      color: "#a855f7"
    },
    {
      icon: BanknoteIcon,
      title: "La regla del 50/30/20",
      description: "Destina 50% a necesidades, 30% a deseos y 20% a ahorros. Esta distribución equilibrada es clave para finanzas saludables.",
      color: "#22c55e"
    },
    {
      icon: Landmark,
      title: "Crea un fondo de emergencia",
      description: "Ahorra entre 3 y 6 meses de gastos. Este colchón financiero te protege de imprevistos sin endeudarte.",
      color: "#f97316"
    },
    {
      icon: CreditCard,
      title: "Controla las deudas",
      description: "Paga primero las deudas con mayor interés. Evita el consumo impulsivo con tarjetas de crédito.",
      color: "#ef4444"
    },
    {
      icon: TrendingUp,
      title: "Invierte en tu futuro",
      description: "Una vez tengas tus finanzas en orden, considera invertir. El interés compuesto trabaja a tu favor con el tiempo.",
      color: "#6366f1"
    }
  ];

  const features = [
    {
      icon: Smartphone,
      title: "Seguimiento en tiempo real",
      description: "Registra tus gastos e ingresos al instante desde cualquier dispositivo",
      color: "#3b82f6"
    },
    {
      icon: ShoppingCart,
      title: "Categorías personalizadas",
      description: "Organiza tus finanzas con categorías que se adaptan a tu estilo de vida",
      color: "#a855f7"
    },
    {
      icon: Target,
      title: "Presupuestos inteligentes",
      description: "Establece límites y recibe alertas cuando te acerques a ellos",
      color: "#22c55e"
    },
    {
      icon: Wallet,
      title: "Múltiples cuentas",
      description: "Gestiona todas tus cuentas bancarias y tarjetas en un solo lugar",
      color: "#f97316"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold dark:text-white mb-6" style={{ fontWeight: "200" }}>
              Toma el control de{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                tus finanzas personales
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-8">
              Aprende a gestionar tu dinero de manera inteligente, establece metas financieras
              y construye un futuro económico sólido con consejos probados y herramientas poderosas.
            </p>



          </div>
        </div>
      </section>

      {/* Financial Tips Section */}
      <section className="py-5 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold dark:text-white mb-4" style={{ fontWeight: "200" }}>
              Consejos para mejorar tus finanzas
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Principios fundamentales basados en &quot;Finanzas Personales para Dummies&quot;
              que transformarán tu relación con el dinero
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tips.map((tip, index) => {
              const IconComponent = tip.icon;
              return (
                <div
                  key={index}
                  className="card group hover:scale-105 transition-all duration-300"
                >
                  <div className="">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                    >
                      <IconComponent
                        size={32}
                        strokeWidth={1.5}
                        style={{ color: tip.color }}
                      />
                    </div>
                    <h3 className="text-xl font-semibold dark:text-white mb-3">
                      {tip.title}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold dark:text-white mb-4" style={{ fontWeight: "200" }}>
              Herramientas que te ayudarán
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Todo lo que necesitas para llevar tus finanzas al siguiente nivel
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="card sm hover:bg-zinc-800/30 dark:hover:bg-zinc-800/30 transition-all"
                >
                  <div className="">
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
                    >
                      <IconComponent
                        size={28}
                        strokeWidth={1.5}
                        style={{ color: feature.color }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center p-4">
            <Link
              href="/dashboard"
              className="px-8 py-2 bg-gradient-to-r from-blue-600 text-center to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-sm font-medium transition-all transform hover:scale-105"
            >
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-12 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="card sm" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.2)'
            }}>
              <div className="cardContent">
                <h2 className="text-3xl sm:text-4xl font-bold dark:text-white mb-4" style={{ fontWeight: "200" }}>
                  ¿Listo para transformar tus finanzas?
                </h2>
                <p className="text-lg text-zinc-300 mb-8">
                  Únete a miles de usuarios que ya están tomando el control de su dinero
                </p>
                <Link
                  href="/register"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  Comenzar ahora - Es gratis
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
