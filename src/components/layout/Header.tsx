'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from "@/src/lib/supabase/client";
import { AppSession, mapSupabaseSessionToApp } from "@/src/types/types";
import { useRouter, usePathname } from 'next/navigation';
import { useUserImage } from '@/src/hooks/useUserImage';
import CurrencySelector from '../common/CurrencySelector';

// Tipos para el menú dinámico
interface MenuItem {
    id: string;
    title: string;
    href?: string;
    children?: MenuItem[];
    isExpandable?: boolean;
}

interface MenuSection {
    id: string;
    title: string;
    items: MenuItem[];
}

// Mockup de datos del menú
const menuData: MenuSection[] = [
    {
        id: 'home',
        title: 'Home',
        items: [
            { id: 'dashboard', title: 'Dashboard', href: '/dashboard' },
        ]
    },
    {
        id: 'operaciones',
        title: 'Operaciones',
        items: [
            // {
            //     id: 'Transacciones',
            //     title: 'Transacciones',
            //     isExpandable: true,
            //     children: [
            //         { id: 'operaciones-sub', title: 'Ingresos', href: '/ingresos' },
            //         { id: 'resources-sub', title: 'Gastos', href: '/gastos' }
            //     ]
            // },
            { id: 'Transacciones', title: 'Transacciones', href: '/transactions' },
            { id: 'Presupuestos', title: 'Presupuestos', href: '/budget' },
            { id: 'Cuentas', title: 'Cuentas', href: '/accounts' },
            { id: 'Categorias', title: 'Categorias', href: '/categorias' }

        ]
    }
];

// Función para obtener el elemento activo basado en la ruta actual
const getActiveItemFromPath = (pathname: string): string => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/transactions') return 'Transacciones';
    if (pathname === '/budget') return 'Presupuestos';
    if (pathname === '/accounts') return 'Cuentas';
    if (pathname === '/categorias') return 'Categorias';
    
    // Ruta por defecto
    return 'dashboard';
};

export function Header() {

    const router = useRouter();
    const pathname = usePathname();

    const [openDropdown, setOpenDropdown] = useState<"profile" | "notification" | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    const [session, setSession] = useState<AppSession | null>(null);
    const [loading, setLoading] = useState(true);
    const { imgSrc, isLoading: imageLoading, hasError: imageError } = useUserImage(session);
    const [notifications] = useState([
        { id: 1, text: "Nuevo pedido recibido", time: "hace 2 min", unread: true },
        { id: 2, text: "Usuario registrado", time: "hace 1 hora", unread: true },
        { id: 3, text: "Backup completado", time: "hace 3 horas", unread: false },
    ]);

    // Estado para manejar elementos expandibles y menú móvil
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<string>(() => getActiveItemFromPath(pathname)); // Estado para el item activo


    useEffect(() => {
        let mounted = true;

        const fetchSession = async () => {
            const { data } = await supabase.auth.getSession();
            const rawSession = data?.session ?? null;
            console.log('rawSession', rawSession);

            if (!mounted) return;
            if (!rawSession) {
                router.push('/login');
            } else {
                const mapped = mapSupabaseSessionToApp(rawSession);
                setSession(mapped);
                console.log('✅ Session set in fetchSession');
            }
            setLoading(false);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (
                profileRef.current && !profileRef.current.contains(event.target as Node) &&
                notificationRef.current && !notificationRef.current.contains(event.target as Node)
            ) {
                setOpenDropdown(null);
            }
        };

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            const mapped = mapSupabaseSessionToApp(s ?? null);
            if (!mapped) router.push('/login');
            else {
                setSession(mapped);
                console.log('✅ Session set in onAuthStateChange');
            }
        });

        fetchSession();
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            mounted = false;
            document.removeEventListener("mousedown", handleClickOutside);
            sub?.subscription?.unsubscribe?.();
        };
    }, [router]);

    // useEffect para actualizar el elemento activo cuando cambie la ruta
    useEffect(() => {
        const newActiveItem = getActiveItemFromPath(pathname);
        setActiveItem(newActiveItem);
    }, [pathname]);

    if (loading) return <div>Cargando...</div>;

    const handleLogout = () => {
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        router.push("/login");
    };

    // Función para toggle de elementos expandibles
    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Función para manejar la selección de items
    const handleItemClick = (itemId: string) => {
        setActiveItem(itemId);
    };

    // Componente para renderizar un item del menú
    const MenuItem = ({ item, level = 0, isMobile = false }: { item: MenuItem; level?: number; isMobile?: boolean }) => {
        const isExpanded = expandedItems[item.id] || false;
        const paddingLeft = level === 0 ? 'pl-4' : 'pl-7';
        const isActive = activeItem === item.id;

        if (item.isExpandable && item.children) {
            return (
                <li className="relative">
                    {/* Barra indicadora para elementos expandibles */}
                    {isActive && (
                        <div
                            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500 to-indigo-500 opacity-100 z-10"
                        // style={{ marginLeft: '8px' }}
                        />
                    )}
                    <button
                        className={`flex justify-between gap-2 py-2 pr-3 text-sm transition-all duration-200 ${paddingLeft} ${isActive
                            ? 'bg-zinc-900/10 text-zinc-900 dark:bg-white/3 dark:text-white shadow-sm'
                            : 'text-zinc-900 dark:text-white'
                            } w-full text-left rounded-lg hover:bg-zinc-900/5 dark:hover:bg-white/3`}
                        onClick={() => toggleExpanded(item.id)}
                        aria-expanded={isExpanded}
                        style={{ borderRadius: '0 5px 5px 0' }}
                    >
                        <span className="truncate">{item.title}</span>
                        <svg
                            className={`h-4 w-4 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <ul
                        role="list"
                        className={`ml-4 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded
                            ? 'max-h-96 opacity-100 transform translate-y-0'
                            : 'max-h-0 opacity-0 transform -translate-y-2'
                            }`}
                    >
                        {item.children.map((child) => (
                            <MenuItem key={child.id} item={child} level={level + 1} isMobile={isMobile} />
                        ))}
                    </ul>
                </li>
            );
        }

        return (
            <li className="relative">
                {/* Barra indicadora para elementos simples */}
                {isActive && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500 to-indigo-500 opacity-100 z-10"
                        style={{ marginLeft: level > 0 ? '12px' : '0px' }}
                    />
                )}
                <Link
                    className={`flex justify-between gap-2 py-2 pr-3 text-sm transition-all duration-200 rounded-lg ${paddingLeft} ${isActive
                        ? 'bg-zinc-900/10 text-zinc-900 dark:bg-white/3 dark:text-white shadow-sm '
                        : level === 0
                            ? 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/3'
                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/3'
                        }`}
                    href={item.href || '#'}
                    onClick={() => handleItemClick(item.id)}
                    style={{ borderRadius: '0 5px 5px 0', marginLeft: '4px' }}
                >
                    <span className="truncate">{item.title}</span>
                </Link>
            </li>
        );
    };

    // Componente reutilizable para la navegación
    const NavigationMenu = ({ isMobile = false }) => {
        return (
            <nav className={isMobile ? "" : "hidden lg:flex lg:items-center lg:mt-10 lg:block"}>
                <ul role="list" style={{ width: '100%' }}>
                    {menuData.map((section) => {
                        // Verificar si algún item de esta sección está activo
                        const hasActiveItem = section.items.some(item => {
                            if (item.children) {
                                return item.children.some(child => child.id === activeItem);
                            }
                            return item.id === activeItem;
                        });

                        return (
                            <li key={section.id} className="relative mt-6 mb-2 md:mt-0">
                                <h2 className="text-xs font-semibold text-zinc-900 dark:text-white">{section.title}</h2>
                                <div className="relative mt-3 pl-2">
                                    {!isMobile && (
                                        <>
                                            <div className="absolute inset-y-0 left-2 w-px bg-zinc-900/10 dark:bg-white/5" style={{ transform: "none", transformOrigin: "50% 50% 0px" }}></div>
                                        </>
                                    )}
                                    {isMobile && (
                                        <>
                                            <div className="absolute inset-y-0 left-2 w-px bg-zinc-900/10 dark:bg-white/5"></div>
                                        </>
                                    )}
                                    <ul role="list" className="border-l border-transparent">
                                        {section.items.map((item) => (
                                            <MenuItem key={item.id} item={item} isMobile={isMobile} />
                                        ))}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}

                    {/* Botón de Sign in solo en móvil */}
                    <li className="sticky bottom-0 z-10 mt-6 min-[416px]:hidden">
                        <a className="inline-flex gap-0.5 justify-center overflow-hidden text-sm font-medium transition rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 w-full" href="#">
                            Sign in
                        </a>
                    </li>
                </ul>
            </nav>
        );
    };

    return (
        <header className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex">
            {/* Contenedor principal del menú unificado */}
            <div className="contents lg:pointer-events-auto  lg:block lg:w-72 lg:overflow-y-auto lg:border-r lg:border-zinc-900/10 lg:px-6 lg:pt-4 lg:pb-8 xl:w-80 lg:dark:border-white/10 dark:bg-black/20">
                <div className="hidden lg:flex">
                    <a aria-label="Home" href="/">
                        <h1 className="text-zinc-300">Financial Sage</h1>
                    </a>
                </div>
                <div
                    className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:left-72 lg:z-30 lg:px-8 xl:left-80 backdrop-blur-xs lg:left-72 xl:left-80 dark:backdrop-blur-sm bg-white/(--bg-opacity-light) dark:bg-zinc-900/(--bg-opacity-dark)"
                    style={{ "--bg-opacity-light": "50%", "--bg-opacity-dark": "20%" } as React.CSSProperties}
                >

                    <div className="absolute inset-x-0 top-full h-px transition bg-zinc-900/7.5 dark:bg-white/7.5"></div> {/* Aparece modo escritorio / desaparece modo celular */}
                    <div className="absolute inset-x-0 top-full h-px transition"></div> {/* Desaparece modo escritorio / aparece modo celular */}

                    <div className="hidden lg:block lg:max-w-md lg:flex-auto">
                        <button
                            type="button"
                            className="hidden h-8 w-full items-center gap-2 rounded-full bg-white pr-3 pl-2 text-sm text-zinc-500 ring-1 ring-zinc-900/10 transition hover:ring-zinc-900/20 lg:flex dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10 dark:ring-inset dark:hover:ring-white/20"
                        >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5 stroke-current">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12.01 12a4.25 4.25 0 1 0-6.02-6 4.25 4.25 0 0 0 6.02 6Zm0 0 3.24 3.25"
                                />
                            </svg>
                            Find something...
                            <kbd className="ml-auto text-2xs text-zinc-400 dark:text-zinc-500">
                                <kbd className="font-sans">Ctrl </kbd>
                                <kbd className="font-sans">K</kbd>
                            </kbd>
                        </button>
                    </div>

                    <div className="flex items-center gap-5 lg:hidden">
                        <button
                            type="button"
                            className="relative flex size-6 items-center justify-center rounded-md transition hover:bg-zinc-900/5 dark:hover:bg-white/5"
                            aria-label="Toggle navigation"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <span className="absolute size-12 pointer-fine:hidden"></span>
                            <svg viewBox="0 0 10 9" fill="none" strokeLinecap="round" aria-hidden="true" className={`w-2.5 stroke-zinc-900 dark:stroke-white ${isMobileMenuOpen ? 'hidden' : 'block'}`}>
                                <path d="M.5 1h9M.5 8h9M.5 4.5h9"></path>
                            </svg> {/* Icono de menú hamburguesa */}
                            <svg viewBox="0 0 10 9" fill="none" strokeLinecap="round" aria-hidden="true" className={`w-2.5 stroke-zinc-900 dark:stroke-white ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
                                <path d="m1.5 1 7 7M8.5 1l-7 7"></path>
                            </svg> {/* Icono de cerrar menú hamburguesa */}
                        </button>
                        <a aria-label="Home" href="/">
                            <h1 className="text-zinc-300">Financial Sage</h1>

                        </a>
                    </div>
                    <div className="flex items-center gap-5">
                        <nav className="hidden md:block">
                            <CurrencySelector />
                            <ul role="list" className="flex items-center gap-8">

                                {/* <li>
                                    <a className="text-sm/5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" href="/">
                                        API
                                    </a>
                                </li>
                                <li>
                                    <a className="text-sm/5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" href="#">
                                        Documentation
                                    </a>
                                </li>
                                <li>
                                    <a className="text-sm/5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" href="#">
                                        Support
                                    </a>
                                </li> */}
                            </ul>
                        </nav>
                        <div className="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15"></div>
                        <div className="flex gap-4">
                            <div className="contents lg:hidden">
                                <button
                                    type="button"
                                    className="relative flex size-6 items-center justify-center rounded-md transition hover:bg-zinc-900/5 lg:hidden dark:hover:bg-white/5"
                                    aria-label="Find something..."
                                >
                                    <span className="absolute size-12 pointer-fine:hidden"></span>
                                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5 stroke-zinc-900 dark:stroke-white">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12.01 12a4.25 4.25 0 1 0-6.02-6 4.25 4.25 0 0 0 6.02 6Zm0 0 3.24 3.25"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <button
                                type="button"
                                className="flex size-6 items-center justify-center rounded-md transition hover:bg-zinc-900/5 dark:hover:bg-white/5"
                                aria-label="Switch to light theme"
                            >
                                <span className="absolute size-12 pointer-fine:hidden"></span>
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5 stroke-zinc-900 dark:hidden">
                                    <path d="M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
                                    <path
                                        strokeLinecap="round"
                                        d="M10 5.5v-1M13.182 6.818l.707-.707M14.5 10h1M13.182 13.182l.707.707M10 15.5v-1M6.11 13.889l.708-.707M4.5 10h1M6.11 6.111l.708.707"
                                    />
                                </svg>
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="hidden h-5 w-5 stroke-white dark:block">
                                    <path d="M15.224 11.724a5.5 5.5 0 0 1-6.949-6.949 5.5 5.5 0 1 0 6.949 6.949Z" />
                                </svg>
                            </button>
                        </div>
                        <div className="profile-dropdown" ref={profileRef}>
                            {imageLoading ? (
                                <div className="profile-img-placeholder" style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#6366f1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px'
                                }}>
                                    ...
                                </div>
                            ) : (
                                <img
                                    className="profile-img"
                                    src={imgSrc || "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=96"}
                                    alt="Profile"
                                    tabIndex={0}
                                    onClick={() => setOpenDropdown(openDropdown === "profile" ? null : "profile")}
                                    onError={(e) => {
                                        console.log('Image error occurred, falling back to generated avatar');
                                        const target = e.target as HTMLImageElement;
                                        const userName = session?.user?.full_name || session?.user?.email || 'User';
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&size=96`;
                                    }}
                                />
                            )}
                            {/* <div className="d-none d-xl-block ps-2">
            <div>{session?.user?.full_name}</div>
            <div className="mt-1 small text-secondary">{session?.user?.email}</div>
          </div> */}
                            <div className={`profile-menu${openDropdown === "profile" ? " show" : ""}`}>
                                <button className="profile-menu-item">View Profile</button>
                                <button className="profile-menu-item" onClick={handleLogout}>Cerrar sesión</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menú de navegación para escritorio */}
                <NavigationMenu isMobile={false} />
            </div>

            {/* Overlay para móvil */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Menu móvil unificado */}
            <div className={`lg:hidden fixed top-14 bottom-0 left-0 w-72 xl:w-80 overflow-y-auto dark:bg-black/20 px-6 pt-4 pb-8 shadow-lg ring-1 shadow-zinc-900/10 ring-zinc-900/7.5 duration-500 ease-in-out  border-zinc-900/10  dark:ring-zinc-800 dark:border-white/10 z-40 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <NavigationMenu isMobile={true} />
            </div>
        </header>
    );
}
