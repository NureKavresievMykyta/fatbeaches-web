import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminDashboard from './AdminDashboard';
import { supabase } from './supabase';
import {
    Leaf, ArrowRight, User, Activity, Scale,
    Coffee, Utensils, Moon, Sun, Plus, LogOut, Loader2,
    Dumbbell, ShieldCheck, AlertCircle, ChevronLeft,
    Settings, History, ChevronDown, Search, X, Globe, Lock, Database
} from 'lucide-react';
import AnalyticsView from './AnalyticsView';

const MealCard = ({ title, icon, calories, color, bg, onClick }) => {
    const IconComponent = icon;
    return (
        <div onClick={onClick} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all group cursor-pointer relative overflow-hidden">
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

// --- FoodModal: Supports generic creation (mealType = null) ---
const FoodModal = ({ session, mealType, onClose, onFoodAdded, role }) => {
    // Инициализируем activeTab на основе пропсов, чтобы не вызывать setState синхронно в эффекте
    const [activeTab, setActiveTab] = useState(() => (!mealType && role === 'trainer') ? 'public' : 'my');
    const [search, setSearch] = useState('');
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);
    const [grams, setGrams] = useState(100);
    const [isCreating, setIsCreating] = useState(false);
    const [newFood, setNewFood] = useState({ name: '', calories: '', proteins: '', fats: '', carbs: '' });

    // Ранее здесь выполнялся эффект, который синхронно делал setActiveTab при изменении mealType/role.
    // Теперь начальное значение задано выше — эффект удалён, чтобы избежать предупреждений о каскадных рендерах.

    useEffect(() => {
        let isMounted = true;
        const loadFoods = async () => {
            setLoading(true);
            let query = supabase.from('food_items').select('*');

            if (activeTab === 'my') {
                // Private dishes
                query = query.eq('created_by_user_id', session.user.id);
            } else {
                // Public dishes (Trainer Base)
                query = query.eq('is_public_plan', true);
            }

            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            const { data } = await query;
            if (isMounted) {
                setFoods(data || []);
                setLoading(false);
            }
        };

        loadFoods();
        return () => { isMounted = false; };
    }, [activeTab, search, session.user.id]);

    const handleAddEntry = async () => {
        // Якщо mealType немає, ми не можемо додати в щоденник (це просто перегляд бази)
        if (!selectedFood || !mealType) return;

        const { error } = await supabase.from('food_entries').insert({
            user_id: session.user.id,
            food_item_id: selectedFood.food_item_id,
            meal_type: mealType,
            quantity_grams: parseFloat(grams),
            date_time: new Date().toISOString()
        });

        if (!error) {
            onFoodAdded();
            onClose();
        } else {
            alert(error.message);
        }
    };

    const handleCreateFood = async (e) => {
        e.preventDefault();

        // LOGIC: Trainer creating in public tab OR creating via "Add to DB" button -> Public
        // Otherwise -> Private
        const shouldBePublic = (role === 'trainer' && activeTab === 'public') || (!mealType && role === 'trainer');

        const { error } = await supabase.from('food_items').insert({
            name: newFood.name,
            calories: parseFloat(newFood.calories),
            proteins: parseFloat(newFood.proteins || 0),
            fats: parseFloat(newFood.fats || 0),
            carbohydrates: parseFloat(newFood.carbs || 0),
            created_by_user_id: session.user.id,
            is_custom_dish: true,
            is_public_plan: shouldBePublic
        });

        if (!error) {
            // Успішно створено
            if (!mealType) {
                // Якщо ми просто створювали страву в базу (не в обід), то просто закриваємо або скидаємо
                alert("Страву успішно створено в базі!");
                setIsCreating(false);
                setNewFood({ name: '', calories: '', proteins: '', fats: '', carbs: '' });
                // Можна оновити список
                setActiveTab(shouldBePublic ? 'public' : 'my');
            } else {
                // Якщо ми були в контексті "Додати до обіду", то повертаємось до вибору, щоб юзер міг її додати
                setIsCreating(false);
                setActiveTab(shouldBePublic ? 'public' : 'my');
                setNewFood({ name: '', calories: '', proteins: '', fats: '', carbs: '' });
            }
        } else {
            alert(error.message);
        }
    };

    const getMealName = (type) => {
        if (!type) return 'База страв'; // Fallback logic
        switch (type) {
            case 'breakfast': return 'Сніданок';
            case 'lunch': return 'Обід';
            case 'dinner': return 'Вечеря';
            case 'snack': return 'Перекус';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        {/* Змінюємо заголовок в залежності від режиму */}
                        <h3 className="text-xl font-bold text-slate-800">
                            {mealType ? `Додати у ${getMealName(mealType)}` : 'Керування стравами'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {mealType ? 'Виберіть страву зі списку' : 'Перегляд та створення страв'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 transition">
                        <X size={20} />
                    </button>
                </div>

                {!isCreating && !selectedFood && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 bg-white shrink-0">
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                                <button onClick={() => setActiveTab('my')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'my' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Мої страви</button>
                                <button onClick={() => setActiveTab('public')} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'public' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>База тренерів</button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Пошук їжі..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-200 transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div> :
                                foods.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 mb-4">Нічого не знайдено</p>
                                        <button onClick={() => setIsCreating(true)} className="text-emerald-600 font-semibold text-sm hover:underline">+ Створити свою страву</button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => setIsCreating(true)} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl font-semibold text-sm mb-2 hover:bg-emerald-50 transition">+ Створити нову страву</button>
                                        {foods.map(food => (
                                            <div key={food.food_item_id} onClick={() => setSelectedFood(food)} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-200 cursor-pointer transition-all flex justify-between items-center shadow-sm">
                                                <div>
                                                    <h4 className="font-bold text-slate-700">{food.name}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{food.calories} ккал</span>
                                                        <span className="text-xs text-slate-400">на 100г</span>
                                                    </div>
                                                </div>
                                                {mealType ? (
                                                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                                        <Plus size={18} />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-400">Інфо</div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )
                            }
                        </div>
                    </div>
                )}

                {selectedFood && (
                    <div className="p-6 flex-1 flex flex-col justify-between bg-white overflow-y-auto">
                        <div>
                            <button onClick={() => setSelectedFood(null)} className="flex items-center text-slate-400 text-sm mb-6 hover:text-slate-600"><ChevronLeft size={16} className="mr-1" /> Назад до списку</button>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">{selectedFood.name}</h2>

                            <div className="grid grid-cols-3 gap-3 mb-8 mt-6">
                                <div className="bg-orange-50 p-3 rounded-2xl text-center border border-orange-100">
                                    <span className="block text-xl font-bold text-orange-500">{Math.round(selectedFood.calories * (grams / 100))}</span>
                                    <span className="text-xs font-bold text-orange-300 uppercase tracking-wide">Ккал</span>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-2xl text-center border border-blue-100">
                                    <span className="block text-xl font-bold text-blue-500">{Math.round((selectedFood.proteins || 0) * (grams / 100))}г</span>
                                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">Білки</span>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-2xl text-center border border-yellow-100">
                                    <span className="block text-xl font-bold text-yellow-500">{Math.round((selectedFood.fats || 0) * (grams / 100))}г</span>
                                    <span className="text-xs font-bold text-yellow-300 uppercase tracking-wide">Жири</span>
                                </div>
                            </div>

                            {/* Show entry calculator ONLY if we are in "Add to Meal" mode */}
                            {mealType && (
                                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                                    <label className="block text-sm font-bold text-slate-700 mb-4 text-center uppercase tracking-wider">Вага порції (грами)</label>
                                    <div className="flex items-center justify-center gap-6">
                                        <button onClick={() => setGrams(prev => Math.max(0, prev - 10))} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition text-xl font-bold">-</button>
                                        <input
                                            type="number"
                                            value={grams}
                                            onChange={(e) => setGrams(e.target.value)}
                                            className="w-24 bg-transparent text-4xl font-extrabold text-center outline-none text-slate-800"
                                        />
                                        <button onClick={() => setGrams(prev => parseFloat(prev) + 10)} className="w-10 h-10 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center text-white active:scale-90 transition text-xl font-bold">+</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {mealType && (
                            <button onClick={handleAddEntry} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all mt-6 text-lg">
                                Додати у щоденник
                            </button>
                        )}
                    </div>
                )}

                {isCreating && (
                    <div className="p-6 flex-1 overflow-y-auto bg-white">
                        <button onClick={() => setIsCreating(false)} className="flex items-center text-slate-400 text-sm mb-6 hover:text-slate-600"><ChevronLeft size={16} className="mr-1" /> Назад</button>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-800">Створення страви</h3>
                        </div>

                        <div className={`mb-6 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${((role === 'trainer' && activeTab === 'public') || (!mealType && role === 'trainer')) ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>
                            {((role === 'trainer' && activeTab === 'public') || (!mealType && role === 'trainer')) ? (
                                <>
                                    <Globe size={18} />
                                    <span>Це блюдо буде додано в <strong>Загальну Базу</strong> (видно всім).</span>
                                </>
                            ) : (
                                <>
                                    <Lock size={18} />
                                    <span>Це блюдо буде <strong>Приватним</strong> (видно тільки вам).</span>
                                </>
                            )}
                        </div>

                        <form onSubmit={handleCreateFood} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Назва продукту</label>
                                <input required value={newFood.name} onChange={e => setNewFood({ ...newFood, name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 focus:bg-white transition-all font-medium" placeholder="Наприклад: Гречка" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ккал (на 100г)</label>
                                    <input type="number" required value={newFood.calories} onChange={e => setNewFood({ ...newFood, calories: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 focus:bg-white transition-all font-bold text-slate-700" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Білки</label>
                                    <input type="number" value={newFood.proteins} onChange={e => setNewFood({ ...newFood, proteins: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 focus:bg-white transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Жири</label>
                                    <input type="number" value={newFood.fats} onChange={e => setNewFood({ ...newFood, fats: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 focus:bg-white transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Вуглеводи</label>
                                    <input type="number" value={newFood.carbs} onChange={e => setNewFood({ ...newFood, carbs: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 focus:bg-white transition-all" />
                                </div>
                            </div>
                            <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all mt-4 text-lg">
                                {mealType ? 'Зберегти' : 'Створити в базі'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

const WorkoutModal = ({ session, onClose, onWorkoutAdded }) => {
    const [duration, setDuration] = useState(30);
    const [activities, setActivities] = useState([]);
    const [selectedActivityId, setSelectedActivityId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchActivities = async () => {
            const { data, error } = await supabase
                .from('workout_items')
                .select('workout_item_id, name, calories_per_hour')
                .order('name');

            if (!error && data && data.length > 0) {
                setActivities(data);
                setSelectedActivityId(data[0].workout_item_id);
            }
        };
        fetchActivities();
    }, []);

    const calculateBurned = () => {
        const activity = activities.find(a => a.workout_item_id == selectedActivityId);
        if (!activity || !activity.calories_per_hour) return 0;
        return Math.round((activity.calories_per_hour / 60) * duration);
    };

    const handleSave = async () => {
        if (!duration || duration <= 0) {
            alert("Будь ласка, введіть тривалість");
            return;
        }
        if (!selectedActivityId) {
            alert("Будь ласка, виберіть активність");
            return;
        }

        setLoading(true);
        const burned = calculateBurned();

        const { error } = await supabase
            .from('workout_entries')
            .insert({
                user_id: session.user.id,
                workout_item_id: parseInt(selectedActivityId, 10),
                duration_minutes: parseInt(duration, 10),
                calories_burned_estimated: burned,
                date_time: new Date().toISOString()
            });

        if (!error) {
            onWorkoutAdded();
            onClose();
        } else {
            alert("Помилка збереження: " + error.message);
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative border border-slate-100">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Нове тренування</h3>
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Вид активності</label>
                        {activities.length > 0 ? (
                            <select
                                value={selectedActivityId}
                                onChange={(e) => setSelectedActivityId(e.target.value)}
                                className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-emerald-300 transition-all cursor-pointer appearance-none text-slate-700 font-medium"
                            >
                                {activities.map((activity) => (
                                    <option key={activity.workout_item_id} value={activity.workout_item_id}>
                                        {activity.name} (~{activity.calories_per_hour} ккал/год)
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="mt-2 p-4 bg-slate-50 rounded-2xl text-slate-400 text-sm">
                                Завантаження списку вправ...
                            </div>
                        )}
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-[2rem] text-center border border-emerald-100 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-200/20 rounded-full blur-xl"></div>
                        <label className="block text-sm font-bold text-emerald-700 mb-2 uppercase tracking-wide">Тривалість (хв)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-transparent text-5xl font-black text-center outline-none text-emerald-600"
                            min="1"
                        />
                        <div className="mt-4 pt-4 border-t border-emerald-200/50">
                            <p className="text-emerald-600/70 text-sm font-medium">Очікуваний результат:</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-3xl font-black text-emerald-700">{calculateBurned()}</span>
                                <span className="text-sm font-bold text-emerald-600 uppercase">ккал</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading || activities.length === 0}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[1.5rem] font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Зберегти тренування'}
                    </button>
                </div>
            </div>
        </div>
    );
};

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
                    throw new Error("Ця пошта вже зареєстрована. Спробуйте увійти.");
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
                <p className="text-center text-slate-400 mb-8 text-sm">Твій шлях до ідеальної форми</p>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 relative">
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${isLogin ? 'left-1.5' : 'left-[calc(50%+1.5px)]'}`}></div>
                    <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl text-sm font-semibold z-10 transition-colors duration-300 ${isLogin ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Вхід</button>
                    <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl text-sm font-semibold z-10 transition-colors duration-300 ${!isLogin ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Реєстрація</button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" required />
                    <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" required />
                    {msg && <div className="text-sm text-center p-3 rounded-xl bg-red-50 text-red-500 border border-red-100">{msg}</div>}
                    <button disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Продовжити' : 'Створити акаунт')}
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
                <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Ласкаво просимо!</h2>
                <p className="text-center text-slate-400 mb-10">Оберіть, як ви хочете використовувати FatBeaches</p>

                <div className="grid md:grid-cols-2 gap-6">
                    <button onClick={() => selectRole('customer')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-emerald-400 hover:shadow-xl transition-all group text-left relative overflow-hidden">
                        <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <User className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Я Користувач</h3>
                        <p className="text-slate-400 text-sm">Хочу стежити за харчуванням, тренуваннями та досягти своєї мети.</p>
                    </button>

                    <button onClick={() => selectRole('trainer')} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-xl transition-all group text-left relative overflow-hidden">
                        <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Dumbbell className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Я Тренер</h3>
                        <p className="text-slate-400 text-sm">Хочу створювати плани тренувань та допомагати іншим.</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

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
                    <h2 className="text-2xl font-bold text-slate-800">Верифікація</h2>
                    <p className="text-slate-400 mt-2 text-sm">Підтвердіть кваліфікацію тренера.</p>
                </div>
                <form onSubmit={submitApplication}>
                    <textarea
                        value={details} onChange={e => setDetails(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-400 outline-none h-40 resize-none text-slate-700 mb-6"
                        placeholder="Ваш досвід, сертифікати..." required />
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : 'Відправити'}
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
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Заявка на розгляді</h2>
            <p className="text-slate-500 mb-8">Адміністратор перевірить ваші дані. Очікуйте.</p>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 font-medium flex items-center justify-center gap-2 mx-auto">
                <LogOut size={18} /> Вийти
            </button>
        </div>
    </div>
);

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
        if (formData.goal === 'lose weight') calories -= 500;
        if (formData.goal === 'gain muscle') calories += 400;

        const updates = {
            user_id: session.user.id,
            age: a,
            weight_kg: w,
            height_cm: h,
            gender: formData.gender,
            goal: formData.goal,
            bmr: Math.round(bmr),
            daily_calories_goal: calories
        };

        const { error } = await supabase.from('user_profiles').upsert(updates, { onConflict: 'user_id' });

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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{initialData ? 'Редагувати' : 'Налаштування'} профілю 👤</h2>
                    <p className="text-slate-400">Заповніть дані для розрахунку калорій</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Вік</label>
                            <input type="number" required placeholder="25" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Зріст (см)</label>
                            <input type="number" required placeholder="175" value={formData.height_cm} onChange={e => setFormData({ ...formData, height_cm: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Вага (кг)</label>
                        <input type="number" required placeholder="70.5" step="0.1" value={formData.weight_kg} onChange={e => setFormData({ ...formData, weight_kg: e.target.value })} className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-2">Стать</label>
                            <div className="relative">
                                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-medium text-slate-700 cursor-pointer border border-slate-100 appearance-none">
                                    <option value="female">Жінка</option>
                                    <option value="male">Чоловік</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-2">Ціль</label>
                            <div className="relative">
                                <select value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-medium text-slate-700 cursor-pointer border border-slate-100 appearance-none">
                                    <option value="lose weight">Схуднути</option>
                                    <option value="maintain">Форма</option>
                                    <option value="gain muscle">Маса</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button disabled={loading} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all mt-4 flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : <>{initialData ? 'Зберегти' : 'Готово'} <ArrowRight size={20} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Dashboard = ({ session, profile, onEditProfile, role }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showFoodModal, setShowFoodModal] = useState(false);
    const [showWorkoutModal, setShowWorkoutModal] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [consumedCalories, setConsumedCalories] = useState(0);
    const [burnedCalories, setBurnedCalories] = useState(0);
    const [mealStats, setMealStats] = useState({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const menuRef = useRef(null);

    const openFoodModal = (mealType) => {
        setSelectedMeal(mealType);
        setShowFoodModal(true);
    };

    useEffect(() => {
        let isMounted = true;
        const loadStats = async () => {
            const today = new Date().toLocaleDateString('en-CA');
            const startTime = `${today}T00:00:00`;
            const endTime = `${today}T23:59:59`;

            const [foodRes, workoutRes] = await Promise.all([
                supabase.from('food_entries')
                    .select('quantity_grams, meal_type, food_items(calories)')
                    .eq('user_id', session.user.id)
                    .gte('date_time', startTime)
                    .lte('date_time', endTime),
                supabase.from('workout_entries')
                    .select('calories_burned_estimated')
                    .eq('user_id', session.user.id)
                    .gte('date_time', startTime)
                    .lte('date_time', endTime)
            ]);

            if (isMounted) {
                let totalConsumed = 0;
                const stats = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

                foodRes.data?.forEach(entry => {
                    const cals = Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                    if (stats[entry.meal_type] !== undefined) stats[entry.meal_type] += cals;
                    totalConsumed += cals;
                });

                const totalBurned = workoutRes.data?.reduce((acc, curr) =>
                    acc + (curr.calories_burned_estimated || 0), 0) || 0;

                setConsumedCalories(totalConsumed);
                setBurnedCalories(totalBurned);
                setMealStats(stats);
            }
        };

        loadStats();
        return () => { isMounted = false; };
    }, [session.user.id, updateTrigger]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dailyGoal = profile?.daily_calories_goal || 2000;
    const netCalories = consumedCalories - burnedCalories;
    const remainingCalories = Math.max(0, dailyGoal - netCalories);
    const progressPercent = Math.round((netCalories / dailyGoal) * 100);

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans animate-fade-in">
            <header className="bg-white px-6 pt-6 pb-8 rounded-b-[3rem] shadow-sm mb-8 relative z-20">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <User size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight">Привіт!</h1>
                            <p className="text-xs text-slate-400 font-medium">Гарного дня</p>
                        </div>
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 bg-slate-50 py-2 px-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm">
                            <span className="text-sm font-semibold text-slate-700">
                                {session.user.user_metadata.name || session.user.email.split('@')[0]}
                            </span>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fade-in">
                                <div className="p-2">
                                    <button onClick={() => { onEditProfile(); setMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors text-left">
                                        <Settings size={18} className="text-emerald-500" /> Налаштування профілю
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAnalytics(true);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors text-left"
                                    >
                                        <History size={18} className="text-blue-500" /> Історія тренувань
                                    </button>
                                </div>
                                <div className="h-px bg-slate-50 my-1"></div>
                                <div className="p-2">
                                    <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 text-sm font-medium transition-colors text-left">
                                        <LogOut size={18} /> Вийти
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-7 rounded-[2.5rem] shadow-xl shadow-emerald-200 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 grid grid-cols-3 gap-2 mb-8 bg-black/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10 text-center">
                        <div className="border-r border-white/10">
                            <p className="text-[10px] uppercase font-black text-emerald-200 mb-1 tracking-tighter">З'їдено</p>
                            <p className="text-xl font-bold">{consumedCalories}</p>
                        </div>
                        <div className="border-r border-white/10">
                            <p className="text-[10px] uppercase font-black text-emerald-200 mb-1 tracking-tighter">Спорт</p>
                            <p className="text-xl font-bold text-orange-300">-{burnedCalories}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-emerald-200 mb-1 tracking-tighter">Залишок</p>
                            <p className="text-xl font-bold">{remainingCalories}</p>
                        </div>
                    </div>

                    <div className="relative z-10 flex justify-between items-end mb-4">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium mb-1 flex items-center gap-2 font-bold uppercase tracking-wider"><Activity size={16} /> Баланс дня</p>
                            <h2 className="text-5xl font-bold tracking-tight">{netCalories}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-emerald-50 text-xs mb-1 font-bold uppercase opacity-70">Ціль</p>
                            <p className="font-bold text-lg">{dailyGoal}</p>
                        </div>
                    </div>

                    <div className="relative h-4 bg-emerald-800/30 rounded-full overflow-hidden p-1 shadow-inner">
                        <div
                            className="bg-white h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: `${Math.min(100, progressPercent)}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            <main className="px-6 space-y-6 relative z-10">
                <button
                    onClick={() => setShowWorkoutModal(true)}
                    className="w-full bg-blue-600 text-white p-6 rounded-[2rem] shadow-lg shadow-blue-100 flex items-center justify-between group hover:bg-blue-700 transition-all active:scale-95"
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-white/20 p-3 rounded-2xl text-white shadow-inner">
                            <Dumbbell size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Тренування</h3>
                            <p className="text-blue-100 text-sm">Додати активність</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {role === 'trainer' && (
                    <button
                        onClick={() => { setSelectedMeal(null); setShowFoodModal(true); }}
                        className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg shadow-indigo-100 flex items-center justify-between group hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-white/20 p-3 rounded-2xl text-white shadow-inner">
                                <Database size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">База страв</h3>
                                <p className="text-indigo-100 text-sm">Створити нову страву</p>
                            </div>
                        </div>
                        <Plus size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Прийоми їжі</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <MealCard onClick={() => openFoodModal('breakfast')} title="Сніданок" icon={Sun} calories={mealStats.breakfast} bg="bg-orange-400" />
                        <MealCard onClick={() => openFoodModal('lunch')} title="Обід" icon={Utensils} calories={mealStats.lunch} bg="bg-emerald-400" />
                        <MealCard onClick={() => openFoodModal('dinner')} title="Вечеря" icon={Moon} calories={mealStats.dinner} bg="bg-indigo-400" />
                        <MealCard onClick={() => openFoodModal('snack')} title="Перекус" icon={Coffee} calories={mealStats.snack} bg="bg-pink-400" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="p-4 bg-purple-50 text-purple-500 rounded-2xl"><Scale size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Вага</p>
                        <p className="text-2xl font-bold text-slate-800">{profile?.weight_kg || '--'} кг</p>
                    </div>
                </div>
            </main>

            {showAnalytics && (
                <AnalyticsView
                    session={session}
                    onClose={() => setShowAnalytics(false)}
                />
            )}

            {showFoodModal && (
                <FoodModal
                    session={session}
                    role={role}
                    mealType={selectedMeal}
                    onClose={() => setShowFoodModal(false)}
                    onFoodAdded={() => setUpdateTrigger(t => t + 1)}
                />
            )}

            {showWorkoutModal && (
                <WorkoutModal
                    session={session}
                    profile={profile}
                    onClose={() => setShowWorkoutModal(false)}
                    onWorkoutAdded={() => setUpdateTrigger(t => t + 1)}
                />
            )}
        </div>
    );
};

function App() {
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null);
    const [profile, setProfile] = useState(null);
    const [trainerApp, setTrainerApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const checkUserStatus = useCallback(async (userId) => {
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (userData) {
                setRole(userData.role);

                if (userData.role === 'admin') {
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
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkUserStatus(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkUserStatus(session.user.id);
            } else {
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

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    if (!session) return <AuthPage />;

    if (role === 'admin') {
        return <AdminDashboard session={session} onLogout={handleLogout} />;
    }

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

    if (role === 'trainer') {
        if (!trainerApp) {
            return <TrainerVerification session={session} onBack={handleBackToRole} onSubmitted={() => checkUserStatus(session.user.id)} />;
        }
        if (trainerApp.status === 'pending') {
            return <TrainerPending />;
        }
        return <Dashboard session={session} profile={profile} role={role} onEditProfile={() => setIsEditingProfile(true)} />;
    }

    if (isEditingProfile) {
        return (
            <ProfileSetup
                session={session}
                initialData={profile}
                onComplete={() => { setIsEditingProfile(false); checkUserStatus(session.user.id); }}
            />
        );
    }

    if (!profile && role === 'customer') {
        return <ProfileSetup session={session} onBack={handleBackToRole} onComplete={() => checkUserStatus(session.user.id)} />;
    }

    return <Dashboard session={session} profile={profile} role={role} onEditProfile={() => setIsEditingProfile(true)} />;
}

export default App;