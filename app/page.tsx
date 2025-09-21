"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase/client";
import styles from "@/app/(auth)/login/Login.module.scss";
import { useRouter } from "next/navigation";
import { getOAuthRedirectUrl } from '@/src/utils/url';

export default function Home() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        // Verificar si ya hay un usuario autenticado
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push('/dashboard');
            }
        };
        
        checkUser();

        // Escuchar cambios en el estado de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    router.push('/dashboard');
                } else if (event === 'SIGNED_OUT') {
                    // Asegurar que estamos en la página de login después del logout
                    console.log('Usuario deslogueado, mostrando login');
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogin = async () => {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        console.log(error);
        setIsLoading(false);
        if (error) {
            console.error("Error logging in:", error.message);
        } else {
            console.log("Login successful!");
            router.push('/dashboard');
        }
    };

    const handleGoogleLogin = async () => {
        const redirectUrl = getOAuthRedirectUrl('/dashboard');
        
        console.log('OAuth Redirect URL:', redirectUrl);
        
        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { 
                redirectTo: redirectUrl
            } 
        });
        if (error) console.error("Error with Google login:", error.message);
    }

    return (
        <div className={styles.root}>
            {/* Elementos decorativos de fondo */}
            <div className={styles.decoratives}>
                <div className={styles.dec1}></div>
                <div className={styles.dec2}></div>
                <div className={styles.dec3}></div>
            </div>

            {/* Contenedor principal */}
            <div className={styles.wrapper}>
                {/* Logo y título */}
                <div className={styles.header}>
                    <div className={styles.logoBox}>
                        <svg className={styles.logoIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h1 className={styles.title}>
                        Financial Sage
                    </h1>
                    <p className={styles.subtitle}>
                        Bienvenido de vuelta
                    </p>
                </div>

                {/* Formulario */}
                <div className={styles.card}>
                    <form className={styles.form}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                name="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.input}
                                required
                            />
                            <div className={styles.inputIcon}>
                                <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                        </div>

                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.passwordToggle}
                            >
                                {showPassword ? (
                                    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className={styles.rowBetween}>
                            <label className={styles.rememberLabel}>
                                <input type="checkbox" className={styles.checkbox} />
                                Recordarme
                            </label>
                            <button type="button" className={styles.linkButton}>
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button
                            disabled={isLoading}
                            className={styles.submit}
                            type="button"
                            onClick={handleLogin}
                        >
                            {isLoading ? (
                                <div className={styles.loadingInline}>
                                    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </div>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    {/* Separador */}
                    <div className={styles.separatorRow}>
                        <div className={styles.separator}></div>
                        <span className={styles.orText}>o continúa con</span>
                        <div className={styles.separator}></div>
                    </div>

                    {/* Botones sociales */}
                    <div className={styles.socialGrid}>
                        <button className={styles.socialButton} onClick={handleGoogleLogin}>
                            <svg className={styles.socialIcon} viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
                        <button className={styles.socialButton}>
                            <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                            </svg>
                            Twitter
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <p>
                        ¿No tienes cuenta?{' '}
                        <Link href="/register" className={styles.linkButton}>Regístrate aquí</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
