import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import {
    Leaf, ArrowRight, User, Activity, Scale,
    Coffee, Utensils, Moon, Sun, Plus, LogOut, Loader2,
    Dumbbell, ShieldCheck, AlertCircle, ChevronLeft, Settings, History, ChevronDown
} from 'lucide-react';

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

const MealCard = ({ title, icon, calories, color, bg }) => {
    const IconComponent = icon;
    return (
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all group cursor-pointer relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 ${bg} opacity-10 rounded-bl-[3rem] transition-all group-hover:scale-150`}></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3.5 rounded-2xl ${color} text-white shadow-md shadow-emerald-100 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent size={22} />
                </div>
                <button className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-emerald-500 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
            <h3 className="text-lg font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{title}</h3>
            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-slate-800">{calories}</span>
                <span className="text-xs text-slate-400 font-medium">ккал</span>
            </div>
        </div>
    );
};

// --- 1. ЭКРАН АВТОРИЗАЦИИ ---
const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) setMsg(error.message);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');
        try {
            const { error } = isLogin
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name: email.split('@')[0] } }
                });

            if (error) {
                if (error.message.includes("already registered") || error.status === 400) {
                    throw new Error("Эта почта уже зарегистрирована. Попробуйте войти.");
                }
                throw error;
            }
        } catch (err) {
            setMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
            <div className="bg-white w-full max-w-md p-10 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 animate-fade-in">
                <div className="flex justify-center mb-6">
                    <div className="bg-emerald-50 p-4 rounded-full">
                        <Leaf className="w-10 h-10 text-emerald-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">FatBeaches</h1>
                <p className="text-center text-slate-400 mb-8 text-sm">Твой путь к идеальной форме</p>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 relative">
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${isLogin ? 'left-1.5' : 'left-[calc(50%+1.5px)]'}`}></div>
                    <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl text-sm font-semibold z-10 transition-colors duration-300 ${isLogin ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Вход</button>
                    <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl text-sm font-semibold z-10 transition-colors duration-300 ${!isLogin ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Регистрация</button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" required />
                    <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" required />
                    {msg && <div className="text-sm text-center p-3 rounded-xl bg-red-50 text-red-500 border border-red-100">{msg}</div>}
                    <button disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Продолжить' : 'Создать аккаунт')}
                    </button>
                </form>

                <div className="mt-6">
                    <button onClick={handleGoogleLogin} className="w-full mt-2 bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-semibold hover:bg-slate-50 transition flex justify-center items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Google
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. ВЫБОР РОЛИ ---
const RoleSelection = ({ session, onRoleSelected }) => {
    const selectRole = async (role) => {
        const { error } = await supabase
            .from('users')
            .update({ role: role })
            .eq('user_id', session.user.id);

        if (!error) onRoleSelected(role);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-2xl w-full animate-fade-in">
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Добро пожаловать!</h2>
                <p className="text-center text-slate-400 mb-10">Выберите, как вы хотите использовать FatBeaches</p>

                <div className="grid md:grid-cols-2 gap-6">
                    <button onClick={() => selectRole('customer')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-emerald-400 hover:shadow-xl transition-all group text-left relative overflow-hidden">
                        <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <User className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Я Пользователь</h3>
                        <p className="text-slate-400 text-sm">Хочу следить за питанием, тренировками и достичь своей цели.</p>
                    </button>

                    <button onClick={() => selectRole('trainer')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-xl transition-all group text-left relative overflow-hidden">
                        <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Dumbbell className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Я Тренер</h3>
                        <p className="text-slate-400 text-sm">Хочу создавать планы тренировок и помогать другим.</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 3. ТРЕНЕР: ВЕРИФИКАЦИЯ ---
const TrainerVerification = ({ session, onSubmitted, onBack }) => {
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const submitApplication = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('trainer_applications').insert({
            user_id: session.user.id,
            credentials_details: details,
            status: 'pending'
        });
        if (!error) onSubmitted();
        else alert(error.message);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white w-full max-w-lg p-10 rounded-[2rem] shadow-xl animate-fade-in relative">
                <button onClick={onBack} className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center mb-8">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Верификация</h2>
                    <p className="text-slate-400 mt-2 text-sm">Подтвердите квалификацию тренера.</p>
                </div>
                <form onSubmit={submitApplication}>
                    <textarea
                        value={details} onChange={e => setDetails(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-400 outline-none h-40 resize-none text-slate-700 mb-6"
                        placeholder="Ваш опыт, сертификаты..." required />
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : 'Отправить'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const TrainerPending = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md bg-white p-10 rounded-[2rem] shadow-xl">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Заявка на рассмотрении</h2>
            <p className="text-slate-500 mb-8">Администратор проверит ваши данные. Ожидайте.</p>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 font-medium flex items-center justify-center gap-2 mx-auto">
                <LogOut size={18} /> Выйти
            </button>
        </div>
    </div>
);

// --- 4. АНКЕТА ПОЛЬЗОВАТЕЛЯ (ПРОФИЛЬ) ---
const ProfileSetup = ({ session, onComplete, onBack, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(initialData || {
        age: '', weight_kg: '', height_cm: '', gender: 'female', goal: 'maintain'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const w = parseFloat(formData.weight_kg);
        const h = parseFloat(formData.height_cm);
        const a = parseFloat(formData.age);

        if (!w || !h || !a) { setLoading(false); return; }

        let bmr = (10 * w) + (6.25 * h) - (5 * a) + (formData.gender === 'male' ? 5 : -161);
        let calories = Math.round(bmr * 1.375);
        if (formData.goal === 'lose_weight') calories -= 500;
        if (formData.goal === 'gain_muscle') calories += 400;

        const updates = {
            user_id: session.user.id,
            age: a, weight_kg: w, height_cm: h, gender: formData.gender, goal: formData.goal,
            bmr: Math.round(bmr), daily_calories_goal: calories
        };

        // ИСПРАВЛЕНИЕ: Добавляем onConflict: 'user_id', чтобы при обновлении не было ошибки дубликата
        const { error } = await supabase
            .from('user_profiles')
            .upsert(updates, { onConflict: 'user_id' });

        if (!error) onComplete();
        else alert(error.message);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white w-full max-w-lg p-8 rounded-[2rem] shadow-xl border border-slate-100 animate-fade-in relative">
                {!initialData && (
                    <button onClick={onBack} className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition">
                        <ChevronLeft size={24} />
                    </button>
                )}
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{initialData ? 'Редактировать' : 'Настройка'} профиля 👤</h2>
                    <p className="text-slate-400">Заполните данные для расчета калорий</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Возраст</label>
                            <input type="number" required placeholder="25" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Рост (см)</label>
                            <input type="number" required placeholder="175" value={formData.height_cm} onChange={e => setFormData({ ...formData, height_cm: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Вес (кг)</label>
                        <input type="number" required placeholder="70.5" step="0.1" value={formData.weight_kg} onChange={e => setFormData({ ...formData, weight_kg: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-2">Пол</label>
                            <div className="relative">
                                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-medium text-slate-700 cursor-pointer border border-slate-100 appearance-none">
                                    <option value="female">Женщина</option>
                                    <option value="male">Мужчина</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-2">Цель</label>
                            <div className="relative">
                                <select value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-medium text-slate-700 cursor-pointer border border-slate-100 appearance-none">
                                    <option value="lose_weight">Похудеть</option>
                                    <option value="maintain">Форма</option>
                                    <option value="gain_muscle">Масса</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button disabled={loading} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all mt-4 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : <>{initialData ? 'Сохранить' : 'Готово'} <ArrowRight size={20} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- 5. ГЛАВНЫЙ ЭКРАН (DASHBOARD) ---
const Dashboard = ({ session, profile, onEditProfile }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans animate-fade-in">
            {/* Header */}
            <header className="bg-white px-6 pt-6 pb-8 rounded-b-[3rem] shadow-sm mb-8 relative z-20">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <User size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight">Привет!</h1>
                            <p className="text-xs text-slate-400 font-medium">Хорошего дня</p>
                        </div>
                    </div>

                    {/* User Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 bg-slate-50 py-2 px-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-100">
                            <span className="text-sm font-semibold text-slate-700">{session.user.user_metadata.name || session.user.email.split('@')[0]}</span>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-fade-in z-50">
                                <div className="p-2">
                                    <button onClick={() => onEditProfile()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors text-left">
                                        <Settings size={18} className="text-emerald-500" /> Настройки профиля
                                    </button>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors text-left">
                                        <History size={18} className="text-blue-500" /> История тренировок
                                    </button>
                                </div>
                                <div className="h-px bg-slate-50 my-1"></div>
                                <div className="p-2">
                                    <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 text-sm font-medium transition-colors text-left">
                                        <LogOut size={18} /> Выйти
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calories Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-7 rounded-[2.5rem] shadow-xl shadow-emerald-200 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute -left-10 bottom-0 w-32 h-32 bg-emerald-300 opacity-20 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex justify-between items-end mb-6">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium mb-1 flex items-center gap-2"><Activity size={16} /> Цель на сегодня</p>
                            <h2 className="text-5xl font-bold tracking-tight">{profile?.daily_calories_goal || 2000}</h2>
                        </div>
                        <div className="text-right bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                            <p className="text-emerald-50 text-xs mb-1">Осталось</p>
                            <p className="font-bold text-lg">{profile?.daily_calories_goal || 2000}</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="bg-emerald-800/30 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                            <div className="bg-white h-full w-[2%] shadow-[0_0_10px_rgba(255,255,255,0.5)] rounded-full"></div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 space-y-6">
                {/* Workout Button */}
                <button className="w-full bg-blue-600 text-white p-6 rounded-[2rem] shadow-lg shadow-blue-200 flex items-center justify-between group hover:bg-blue-700 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl text-white">
                            <Dumbbell size={28} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold">Тренировка</h3>
                            <p className="text-blue-100 text-sm">Начать активность</p>
                        </div>
                    </div>
                    <div className="bg-white text-blue-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                        <ArrowRight size={20} />
                    </div>
                </button>

                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Приемы пищи</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <MealCard title="Завтрак" icon={Sun} calories={0} color="bg-orange-400" bg="bg-orange-400" />
                        <MealCard title="Обед" icon={Utensils} calories={0} color="bg-emerald-400" bg="bg-emerald-400" />
                        <MealCard title="Ужин" icon={Moon} calories={0} color="bg-indigo-400" bg="bg-indigo-400" />
                        <MealCard title="Перекус" icon={Coffee} calories={0} color="bg-pink-400" bg="bg-pink-400" />
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Параметры</h2>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-50 text-purple-500 rounded-2xl"><Scale size={24} /></div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Вес</p>
                                <p className="text-2xl font-bold text-slate-800">{profile?.weight_kg || '--'} <span className="text-sm text-slate-400 font-normal">кг</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- ГЛАВНЫЙ КОНТРОЛЛЕР ---
function App() {
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null);
    const [profile, setProfile] = useState(null);
    const [trainerApp, setTrainerApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const checkUserStatus = async (userId) => {
        const { data: userData } = await supabase.from('users').select('role').eq('user_id', userId).single();

        if (userData) {
            setRole(userData.role);
            if (userData.role === 'trainer') {
                const { data: appData } = await supabase.from('trainer_applications').select('*').eq('user_id', userId).single();
                setTrainerApp(appData);
            } else {
                const { data: profileData } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
                setProfile(profileData);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkUserStatus(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) checkUserStatus(session.user.id);
            else { setRole(null); setProfile(null); setLoading(false); }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleBackToRole = async () => {
        setRole(null);
        // Сбрасываем роль в базе на null, чтобы юзер мог выбрать заново (если это нужно)
        // Но обычно роль выбирается один раз. Здесь мы просто вернемся в меню.
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;

    if (!session) return <AuthPage />;

    if (!profile && !trainerApp && (role === 'customer' || !role)) {
        if (!role) return <RoleSelection session={session} onRoleSelected={(r) => { setRole(r); }} />;
        // Если роль выбрана, но профиля нет -> Анкета
        if (role === 'customer') return <ProfileSetup session={session} onBack={handleBackToRole} onComplete={() => checkUserStatus(session.user.id)} />;
        if (role === 'trainer') return <TrainerVerification session={session} onBack={handleBackToRole} onSubmitted={() => checkUserStatus(session.user.id)} />;
    }

    if (role === 'trainer') {
        if (!trainerApp) return <TrainerVerification session={session} onBack={handleBackToRole} onSubmitted={() => checkUserStatus(session.user.id)} />;
        if (trainerApp.status === 'pending') return <TrainerPending />;
        return <div className="p-10 text-center">Тренерская панель (В разработке)</div>;
    }

    if (isEditingProfile) {
        return <ProfileSetup session={session} initialData={profile} onComplete={() => { setIsEditingProfile(false); checkUserStatus(session.user.id); }} />;
    }

    // Если профиля нет, но роль customer (баг-фикс)
    if (!profile && role === 'customer') {
        return <ProfileSetup session={session} onBack={handleBackToRole} onComplete={() => checkUserStatus(session.user.id)} />;
    }

    return <Dashboard session={session} profile={profile} onEditProfile={() => setIsEditingProfile(true)} />;
}

export default App;