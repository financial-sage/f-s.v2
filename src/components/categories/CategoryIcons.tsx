import {
    ShoppingCart,
    Car,
    Home,
    Utensils,
    Gamepad2,
    Gamepad,
    Shirt,
    Heart,
    GraduationCap,
    Plane,
    Coffee,
    CreditCard,
    Wallet,
    Banknote,
    Plus,
    Smartphone,
    Music,
    Book,
    Gift,
    Pizza,
    Fuel,
    Hospital,
    Dumbbell,
    Camera,
    Scissors,
    PiggyBank,
    TrendingUp,
    ShoppingBag,
    Landmark,
    HandCoins,
    Notebook,
    Dock,
    WalletMinimal,
    Cake,
    Bus,
    BusFront,
    Carrot,
    ChartBar,
    Settings2,
    Settings,
    BanknoteArrowDown,
    BanknoteArrowUp,
    BanknoteIcon,
    type LucideIcon
} from "lucide-react";

export interface IconOption {
    name: string;
    icon: LucideIcon;
    label: string;
}

export const AVAILABLE_ICONS: IconOption[] = [
    { name: 'shopping-cart', icon: ShoppingCart, label: 'Compras' },
    { name: 'car', icon: Car, label: 'Transporte' },
    { name: 'home', icon: Home, label: 'Hogar' },
    { name: 'utensils', icon: Utensils, label: 'Restaurantes' },
    { name: 'gamepad2', icon: Gamepad2, label: 'Entretenimiento' },
    { name: 'gamepad', icon: Gamepad, label: 'Videojuegos' },
    { name: 'shirt', icon: Shirt, label: 'Ropa' },
    { name: 'heart', icon: Heart, label: 'Salud' },
    { name: 'graduation-cap', icon: GraduationCap, label: 'Educación' },
    { name: 'plane', icon: Plane, label: 'Viajes' },
    { name: 'coffee', icon: Coffee, label: 'Café' },
    { name: 'credit-card', icon: CreditCard, label: 'Tarjetas' },
    { name: 'wallet', icon: Wallet, label: 'Efectivo' },
    { name: 'banknote', icon: Banknote, label: 'Dinero' },
    { name: 'smartphone', icon: Smartphone, label: 'Tecnología' },
    { name: 'music', icon: Music, label: 'Música' },
    { name: 'book', icon: Book, label: 'Libros' },
    { name: 'gift', icon: Gift, label: 'Regalos' },
    { name: 'pizza', icon: Pizza, label: 'Comida Rápida' },
    { name: 'fuel', icon: Fuel, label: 'Combustible' },
    { name: 'hospital', icon: Hospital, label: 'Médico' },
    { name: 'dumbbell', icon: Dumbbell, label: 'Gimnasio' },
    { name: 'camera', icon: Camera, label: 'Fotografía' },
    { name: 'scissors', icon: Scissors, label: 'Servicios' },
    { name: 'piggy-bank', icon: PiggyBank, label: 'Ahorros' },
    { name: 'trending-up', icon: TrendingUp, label: 'Inversiones' },
    { name: 'shopping-bag', icon: ShoppingBag, label: 'Compras Online' },
    { name: 'plus', icon: Plus, label: 'Otros' },
    { name: 'landmark', icon: Landmark, label: 'Tarjeta' },
    { name: 'hand-coins', icon: HandCoins, label: 'Salarios' },
    { name: 'notebook', icon: Notebook, label: 'Oficina' },
    { name: 'dock', icon: Dock, label: 'Viajes' },
    { name: 'wallet-minimal', icon: WalletMinimal, label: 'Efectivo' },
    { name: 'cake', icon: Cake, label: 'Cumpleaños' },
    { name: 'bus', icon: Bus, label: 'Transporte' },
    { name: 'bus-front', icon: BusFront, label: 'Transporte' },
    { name: 'carrot', icon: Carrot, label: 'Comida' },
    { name: 'chart-bar', icon: ChartBar, label: 'Estadísticas' },
    { name: 'settings2', icon: Settings2, label: 'Configuración' },
    { name: 'settings', icon: Settings, label: 'Ajustes' },
    { name: 'banknote-arrow-down', icon: BanknoteArrowDown, label: 'Ingreso' },
    { name: 'banknote-arrow-up', icon: BanknoteArrowUp, label: 'Gasto' },
    { name: 'banknote-icon', icon: BanknoteIcon, label: 'Dinero' },
];

export interface CategoryIconProps {
    iconName: string;
    color?: string;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export function CategoryIcon({ 
    iconName, 
    color = '#e4e4e7', 
    size = 30, 
    strokeWidth = 1, 
    className = '' 
}: CategoryIconProps) {
    const iconOption = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    
    if (!iconOption) {
        const DefaultIcon = Plus;
        return (
            <DefaultIcon 
                size={size} 
                strokeWidth={strokeWidth} 
                className={className}
                style={{ color }}
            />
        );
    }
    
    const IconComponent = iconOption.icon;
    
    return (
        <IconComponent 
            size={size} 
            strokeWidth={strokeWidth} 
            className={className}
            style={{ color }}
        />
    );
}

export function getIconByName(iconName: string): LucideIcon {
    const iconOption = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    return iconOption ? iconOption.icon : Plus;
}