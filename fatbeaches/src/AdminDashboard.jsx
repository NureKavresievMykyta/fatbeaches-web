import React, { useState, useEffect } from 'react';
import {
    Users, Utensils, Activity, Plus, Trash2, Save, X, Search,
    Eye, Edit2, CheckCircle, AlertCircle, ArrowUpDown,
    LayoutDashboard, FileText, Check, XOctagon
} from 'lucide-react';
import { supabase } from './supabase';

const AdminDashboard = ({ onLogout }) => {
    // Основні стани
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'foods', 'workouts', 'applications'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Стан для статистики
    const [stats, setStats] = useState({ users: 0, foods: 0, workouts: 0, pendingTrainers: 0 });

    // Стан для модальних вікон
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const [userRole, setUserRole] = useState('');
    const [userStatus, setUserStatus] = useState('');

    useEffect(() => {
        fetchData();
        if (activeTab === 'overview') fetchStats();
    }, [activeTab]);

    // --- ОТРИМАННЯ СТАТИСТИКИ ---
    const fetchStats = async () => {
        try {
            const [users, foods, workouts, apps] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('food_items').select('*', { count: 'exact', head: true }),
                supabase.from('workout_items').select('*', { count: 'exact', head: true }),
                supabase.from('trainer_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            ]);

            setStats({
                users: users.count || 0,
                foods: foods.count || 0,
                workouts: workouts.count || 0,
                pendingTrainers: apps.count || 0
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // --- ОТРИМАННЯ ДАНИХ ТАБЛИЦЬ ---
    const fetchData = async () => {
        if (activeTab === 'overview') return; // Для огляду дані не потрібні тут

        setLoading(true);
        try {
            let query;
            if (activeTab === 'users') {
                query = supabase.from('users').select('*');
            } else if (activeTab === 'foods') {
                query = supabase.from('food_items').select('*').order('name');
            } else if (activeTab === 'workouts') {
                query = supabase.from('workout_items').select('*').order('name');
            } else if (activeTab === 'applications') {
                // Отримуємо заявки разом з даними користувача (якщо зв'язок налаштований)
                // Якщо зв'язку FK немає, просто беремо заявки
                query = supabase.from('trainer_applications').select('*').order('created_at', { ascending: false });
            }

            const { data, error } = await query;
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- ЛОГІКА ЗАЯВОК ТРЕНЕРІВ ---
    const handleApplication = async (appId, userId, action) => {
        if (!window.confirm(`Ви впевнені, що хочете ${action === 'approved' ? 'схвалити' : 'відхилити'} цю заявку?`)) return;

        try {
            // 1. Оновлюємо статус заявки
            const { error: appError } = await supabase
                .from('trainer_applications')
                .update({ status: action })
                .eq('id', appId);

            if (appError) throw appError;

            // 2. Якщо схвалено, оновлюємо роль користувача
            if (action === 'approved') {
                const { error: userError } = await supabase
                    .from('users')
                    .update({ role: 'trainer' })
                    .eq('user_id', userId);

                if (userError) throw userError;
            }

            alert(`Заявку успішно ${action === 'approved' ? 'схвалено' : 'відхилено'}!`);
            fetchData(); // Оновити список
            fetchStats(); // Оновити лічильники
        } catch (error) {
            alert('Помилка: ' + error.message);
        }
    };

    // --- СОРТУВАННЯ ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedItems = React.useMemo(() => {
        if (activeTab === 'overview') return [];
        let sortableItems = [...items];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';
                if (activeTab === 'users' && sortConfig.key === 'name') {
                    aValue = getUserDisplayName(a);
                    bValue = getUserDisplayName(b);
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig, activeTab]);

    // --- CRUD ОПЕРАЦІЇ ---
    const handleDelete = async (id) => {
        if (!window.confirm('Видалити цей запис?')) return;
        try {
            const table = activeTab === 'foods' ? 'food_items' :
                activeTab === 'workouts' ? 'workout_items' :
                    activeTab === 'applications' ? 'trainer_applications' : 'users';

            const idColumn = activeTab === 'users' ? 'user_id' : 'id';
            const { error } = await supabase.from(table).delete().eq(idColumn, id);
            if (error) throw error;
            setItems(items.filter(item => item[idColumn] !== id));
        } catch (error) { alert(error.message); }
    };

    const handleSaveItem = async () => {
        try {
            const table = activeTab === 'foods' ? 'food_items' : 'workout_items';
            if (activeTab === 'foods' && (!formData.name || !formData.calories)) { alert('Заповніть поля'); return; }
            if (activeTab === 'workouts' && !formData.name) { alert('Заповніть назву'); return; }

            let result;
            if (editingItem) {
                result = await supabase.from(table).update(formData).eq('id', editingItem.id).select();
            } else {
                result = await supabase.from(table).insert([formData]).select();
            }

            if (result.error) throw result.error;
            if (editingItem) {
                setItems(items.map(i => i.id === editingItem.id ? result.data[0] : i));
            } else {
                setItems([...items, result.data[0]]);
            }
            setIsModalOpen(false);
            fetchStats(); // Оновити статистику
        } catch (error) { alert(error.message); }
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        setFormData(item || {});
        setIsModalOpen(true);
    };

    // --- USER PROFILE ---
    const handleViewUser = async (user) => {
        setSelectedUser(user);
        setUserRole(user.role || 'customer');
        setUserStatus(user.status || 'active');
        setIsUserModalOpen(true);
        setLoadingProfile(true);
        setUserProfile(null);
        try {
            const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.user_id).single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) setUserProfile(data);
        } catch (error) { console.error(error); } finally { setLoadingProfile(false); }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        try {
            const { error } = await supabase.from('users').update({ role: userRole, status: userStatus }).eq('user_id', selectedUser.user_id);
            if (error) throw error;
            setItems(items.map(u => u.user_id === selectedUser.user_id ? { ...u, role: userRole, status: userStatus } : u));
            alert('Оновлено!');
            setIsUserModalOpen(false);
        } catch (error) { alert(error.message); }
    };

    function getUserDisplayName(user) {
        if (!user) return 'Користувач';
        if (user.name) return user.name;
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.full_name) return user.full_name;
        if (user.email) return user.email;
        return `ID: ${user.user_id?.substring(0, 6)}`;
    };

    const filteredItems = sortedItems.filter(item => {
        const term = searchTerm.toLowerCase();
        const name = (item.name || getUserDisplayName(item) || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* --- HEADER --- */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-xl text-white">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-none">Admin Panel</h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">FatBeaches Manager</p>
                    </div>
                </div>
                <button onClick={onLogout} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-all">
                    Вийти
                </button>
            </header>

            <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 space-y-8">
                {/* --- TABS --- */}
                <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={LayoutDashboard} label="Головна" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Користувачі" />
                    <TabButton active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} icon={FileText} label="Заявки" badge={stats.pendingTrainers} />
                    <TabButton active={activeTab === 'foods'} onClick={() => setActiveTab('foods')} icon={Utensils} label="Продукти" />
                    <TabButton active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={Activity} label="Вправи" />
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Огляд системи</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Всього користувачів" value={stats.users} icon={Users} color="blue" />
                            <StatCard title="Заявок на тренера" value={stats.pendingTrainers} icon={FileText} color="orange" />
                            <StatCard title="Продуктів у базі" value={stats.foods} icon={Utensils} color="emerald" />
                            <StatCard title="Типів тренувань" value={stats.workouts} icon={Activity} color="purple" />
                        </div>

                        <div className="mt-10 p-8 bg-white rounded-[2rem] border border-slate-200 text-center">
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Ласкаво просимо в адмінку FatBeaches!</h3>
                            <p className="text-slate-500">Виберіть розділ у меню зверху, щоб почати керування базою даних.</p>
                        </div>
                    </div>
                )}

                {/* --- OTHER TABS (TABLES) --- */}
                {activeTab !== 'overview' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Пошук..."
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {activeTab !== 'users' && activeTab !== 'applications' && (
                                <button onClick={() => openModal(null)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200">
                                    <Plus size={20} /> Додати запис
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            {loading ? (
                                <div className="flex justify-center items-center h-64 text-slate-400">Завантаження...</div>
                            ) : filteredItems.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/50 border-b border-slate-200">
                                            <tr>
                                                <th onClick={() => handleSort('name')} className="p-5 text-xs font-black text-slate-400 uppercase cursor-pointer hover:text-blue-600 group">
                                                    <div className="flex items-center gap-1">
                                                        {activeTab === 'applications' ? 'Користувач / Статус' : 'Назва / Email'}
                                                        <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </th>
                                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Деталі</th>
                                                <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Дії</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredItems.map((item) => (
                                                <tr key={item.id || item.user_id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="p-5">
                                                        {activeTab === 'applications' ? (
                                                            <div>
                                                                <div className="font-bold text-slate-700">User ID: {item.user_id?.substring(0, 8)}...</div>
                                                                <div className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleDateString()}</div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="font-bold text-slate-700 text-base">
                                                                    {activeTab === 'users' ? getUserDisplayName(item) : (item.name || 'Без назви')}
                                                                </div>
                                                                {activeTab === 'users' && <div className="text-xs text-slate-400 mt-0.5">{item.email}</div>}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-5">
                                                        {activeTab === 'applications' && (
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${item.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                    item.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                        'bg-red-50 text-red-600 border-red-100'
                                                                }`}>
                                                                {item.status}
                                                            </span>
                                                        )}
                                                        {activeTab === 'foods' && (
                                                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                                                <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md">{item.calories} ккал</span>
                                                            </div>
                                                        )}
                                                        {activeTab === 'users' && (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{item.role || 'customer'}</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'banned' ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.status || 'Active'}</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {activeTab === 'applications' && item.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleApplication(item.id, item.user_id, 'approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Схвалити"><Check size={16} /></button>
                                                                    <button onClick={() => handleApplication(item.id, item.user_id, 'rejected')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Відхилити"><XOctagon size={16} /></button>
                                                                </>
                                                            )}
                                                            {activeTab === 'users' && (
                                                                <button onClick={() => handleViewUser(item)} className="p-2 bg-white border hover:bg-slate-50 rounded-lg text-slate-500"><Eye size={16} /></button>
                                                            )}
                                                            {(activeTab === 'foods' || activeTab === 'workouts') && (
                                                                <button onClick={() => openModal(item)} className="p-2 bg-white border hover:bg-slate-50 rounded-lg text-slate-500"><Edit2 size={16} /></button>
                                                            )}
                                                            <button onClick={() => handleDelete(item.id || item.user_id)} className="p-2 bg-white border hover:text-red-600 rounded-lg text-slate-400"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <p>Записів не знайдено</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* --- MODAL ADD/EDIT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'Редагувати' : 'Додати'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">Назва</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:border-blue-500 border-2 outline-none" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            {activeTab === 'foods' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500">Калорії</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.calories || ''} onChange={e => setFormData({ ...formData, calories: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Білки</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.protein || ''} onChange={e => setFormData({ ...formData, protein: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Жири</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.fat || ''} onChange={e => setFormData({ ...formData, fat: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Вуглеводи</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.carbs || ''} onChange={e => setFormData({ ...formData, carbs: e.target.value })} /></div>
                                </div>
                            )}
                            <button onClick={handleSaveItem} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4 flex justify-center gap-2"><Save size={20} /> Зберегти</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL USER EDIT --- */}
            {isUserModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col md:flex-row gap-8">
                        <button onClick={() => setIsUserModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                        <div className="flex-1">
                            <h3 className="text-xl font-black mb-1">{getUserDisplayName(selectedUser)}</h3>
                            <p className="text-sm text-slate-500 mb-4">{selectedUser.email}</p>
                            {loadingProfile ? <p>Завантаження...</p> : userProfile ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2"><span className="font-bold">Вага:</span> {userProfile.weight_kg} кг</div>
                                    <div className="flex gap-2"><span className="font-bold">Зріст:</span> {userProfile.height_cm} см</div>
                                    <div className="flex gap-2"><span className="font-bold">Ціль:</span> {userProfile.goal}</div>
                                </div>
                            ) : <p className="text-slate-400 border p-2 rounded text-center text-sm">Профіль не заповнено</p>}
                        </div>
                        <div className="flex-1 border-l pl-8 space-y-4">
                            <h4 className="font-bold flex items-center gap-2"><Edit2 size={16} /> Редагувати доступ</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Роль</label>
                                <div className="flex gap-2">{['customer', 'trainer', 'admin'].map(r => <button key={r} onClick={() => setUserRole(r)} className={`px-3 py-1 rounded capitalize border ${userRole === r ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`}>{r}</button>)}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Статус</label>
                                <div className="flex gap-2">{['active', 'banned'].map(s => <button key={s} onClick={() => setUserStatus(s)} className={`px-3 py-1 rounded capitalize border ${userStatus === s ? (s === 'active' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-white'}`}>{s}</button>)}</div>
                            </div>
                            <button onClick={handleUpdateUser} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex justify-center gap-2"><Save size={18} /> Зберегти</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600'
    };
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${colors[color]}`}>
                {React.createElement(icon, { size: 24 })}
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, badge }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${active ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
        {React.createElement(icon, { size: 16 })}
        {label}
        {badge > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
);

export default AdminDashboard;