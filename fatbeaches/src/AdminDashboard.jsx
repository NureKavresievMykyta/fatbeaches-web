import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabase';

// Імпорти компонентів (переконайтеся, що шляхи правильні)
import AuthPage from './AuthPage';
import RoleSelection from './RoleSelection';
import ProfileSetup from './ProfileSetup';
import Dashboard from './Dashboard';
import TrainerVerification from './TrainerVerification';
import AdminDashboard from './AdminDashboard'; // <--- ДОДАНО

// Тимчасова заглушка для TrainerPending, якщо немає окремого файлу
const TrainerPending = () => <div className="p-10 text-center">Заявка на розгляді</div>;

function App() {
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null); // Тут буде 'customer', 'trainer' або 'admin'
    const [profile, setProfile] = useState(null);
    const [trainerApp, setTrainerApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Функція перевірки статусу користувача
    const checkUserStatus = useCallback(async (userId) => {
        try {
            // 1. Отримуємо роль з таблиці users
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (userData) {
                setRole(userData.role);

                // 2. Логіка завантаження даних залежно від ролі
                if (userData.role === 'admin') {
                    // Для адміна додаткові дані (профіль/заявка) не потрібні
                    setLoading(false);
                    return;
                }

                if (userData.role === 'trainer') {
                    const { data: appData } = await supabase
                        .from('trainer_applications')
                        .select('*')
                        .eq('user_id', userId)
                        .single();
                    setTrainerApp(appData);
                } else {
                    // За замовчуванням вважаємо клієнтом ('customer')
                    const { data: profileData } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('user_id', userId)
                        .single();
                    if (profileData) {
                        setProfile(profileData);
                    }
                }
            }
        } catch (error) {
            console.error("Error checking user status:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Перевірка сесії при завантаженні
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkUserStatus(session.user.id);
            else setLoading(false);
        });

        // Слухач змін авторизації (вхід/вихід)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkUserStatus(session.user.id);
            } else {
                // Скидання стану при виході
                setRole(null);
                setProfile(null);
                setTrainerApp(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [checkUserStatus]);

    const handleBackToRole = async () => {
        setRole(null);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // 1. Екран завантаження
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    // 2. Якщо немає сесії -> Авторизація
    if (!session) return <AuthPage />;

    // 3. Якщо роль АДМІН -> Адмін Панель (НОВЕ)
    if (role === 'admin') {
        return <AdminDashboard session={session} onLogout={handleLogout} />;
    }

    // 4. Логіка для нових користувачів (без ролі або профілю)
    if (!profile && !trainerApp && (role === 'customer' || !role)) {
        if (!role) {
            return <RoleSelection session={session} onRoleSelected={(r) => setRole(r)} />;
        }
        if (role === 'customer') {
            return <ProfileSetup session={session} onBack={handleBackToRole} onComplete={() => checkUserStatus(session.user.id)} />;
        }
        if (role === 'trainer') {
            return <TrainerVerification session={session} onBack={handleBackToRole} onSubmitted={() => checkUserStatus(session.user.id)} />;
        }
    }

    // 5. Логіка для Тренера
    if (role === 'trainer') {
        if (!trainerApp) {
            return <TrainerVerification session={session} onBack={handleBackToRole} onSubmitted={() => checkUserStatus(session.user.id)} />;
        }
        if (trainerApp.status === 'pending') {
            return <TrainerPending />;
        }
        return <div className="p-10 text-center">Тренерська панель (В розробці)</div>;
    }

    // 6. Редагування профілю
    if (isEditingProfile) {
        return (
            <ProfileSetup
                session={session}
                initialData={profile}
                onComplete={() => { setIsEditingProfile(false); checkUserStatus(session.user.id); }}
            />
        );
    }

    // 7. Якщо роль customer, але профіль не завантажився (рідкісний кейс, але можливий)
    if (!profile && role === 'customer') {
        return <ProfileSetup session={session} onBack={handleBackToRole} onComplete={() => checkUserStatus(session.user.id)} />;
    }

    // 8. Головний Дашборд Клієнта
    return <Dashboard session={session} profile={profile} onEditProfile={() => setIsEditingProfile(true)} />;
}

export default App;