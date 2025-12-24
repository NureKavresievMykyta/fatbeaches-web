import React, { useState, useEffect } from 'react';
import {
    Users, Utensils, Activity, Plus, Trash2, Save, X, Search,
    Eye, Edit2, Check, XOctagon, Calendar,
    LayoutDashboard, FileText, ArrowUpDown
} from 'lucide-react';
import { supabase } from './supabase';

const AdminDashboard = ({ onLogout }) => {
    // --- КОНФИГУРАЦИЯ ТАБЛИЦ (Строго по PDF) ---
    const getTableConfig = (tab) => {
        switch (tab) {
            case 'users':
                return { table: 'users', idField: 'user_id' };
            case 'foods':
                return { table: 'food_items', idField: 'food_item_id' }; // [cite: 17]
            case 'workouts':
                return { table: 'workout_items', idField: 'workout_item_id' }; // [cite: 46]
            case 'applications':
                return { table: 'trainer_applications', idField: 'application_id' }; // [cite: 32]
            default:
                return { table: '', idField: 'id' };
        }
    };

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('overview');
    const [items, setItems] = useState([]);
    const [dashboardDishes, setDashboardDishes] = useState([]);
    const [usersLookup, setUsersLookup] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Stats
    const [stats, setStats] = useState({ users: 0, foods: 0, workouts: 0, pendingTrainers: 0 });

    // Application Filter
    const [appFilter, setAppFilter] = useState('pending');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const [userRole, setUserRole] = useState('');
    const [userStatus, setUserStatus] = useState('');

    // --- IMAGES (Заглушки) ---
    const foodImages = [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1612874742237-982e9657dd18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'
    ];

    // --- EFFECTS ---
    useEffect(() => {
        if (activeTab !== 'overview') {
            setItems([]);
            setUsersLookup({});
            fetchData();
        } else {
            fetchStats();
            fetchDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, appFilter]);

    // --- FETCH STATS ---
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

    // --- FETCH DASHBOARD ---
    const fetchDashboardData = async () => {
        try {
            const { data, error } = await supabase
                .from('food_items')
                .select('*')
                .order('food_item_id', { ascending: false })
                .limit(4);

            if (error) throw error;

            if (!data || data.length === 0) {
                setDashboardDishes([
                    { food_item_id: 1, name: 'Демо: Стейк лосося', calories: 320, proteins: 25, fats: 15, carbohydrates: 5 },
                    { food_item_id: 2, name: 'Демо: Боул з кіноа', calories: 380, proteins: 12, fats: 10, carbohydrates: 45 },
                    { food_item_id: 3, name: 'Демо: Салат Цезар', calories: 450, proteins: 20, fats: 20, carbohydrates: 15 },
                    { food_item_id: 4, name: 'Демо: Паста', calories: 550, proteins: 18, fats: 12, carbohydrates: 60 },
                ]);
            } else {
                setDashboardDishes(data);
            }
        } catch (error) {
            console.error("Error fetching dashboard dishes:", error);
        }
    };

    // --- FETCH DATA LISTS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            let data = [];

            if (activeTab === 'users') {
                const { data: users, error } = await supabase.from('users').select('*');
                if (error) throw error;
                data = users;
            }
            else if (activeTab === 'foods') {
                const { data: foods, error } = await supabase.from('food_items').select('*').order('name');
                if (error) throw error;
                data = foods;
            }
            else if (activeTab === 'workouts') {
                const { data: workouts, error } = await supabase.from('workout_items').select('*').order('name');
                if (error) throw error;
                data = workouts;
            }
            else if (activeTab === 'applications') {
                let query = supabase
                    .from('trainer_applications')
                    .select('*')
                    .order('submitted_at', { ascending: false });

                if (appFilter !== 'all') {
                    query = query.eq('status', appFilter);
                }

                const { data: apps, error: appError } = await query;
                if (appError) throw appError;

                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('user_id, email, name, first_name, last_name');

                if (!userError && users) {
                    const lookup = {};
                    users.forEach(u => lookup[u.user_id] = u);
                    setUsersLookup(lookup);
                }
                data = apps;
            }

            setItems(data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLE APPLICATION (APPROVE/REJECT) ---
    const handleApplication = async (appId, userId, action) => {
        if (!appId) {
            alert("Помилка: ID заявки не знайдено.");
            return;
        }

        const actionText = action === 'approved' ? 'СХВАЛИТИ' : 'ВІДХИЛИТИ';
        if (!window.confirm(`Ви впевнені, що хочете ${actionText} цю заявку?`)) return;

        try {
            const { idField } = getTableConfig('applications');

            const { error: appError } = await supabase
                .from('trainer_applications')
                .update({ status: action })
                .eq(idField, appId);

            if (appError) throw appError;

            if (action === 'approved') {
                const { error: userError } = await supabase
                    .from('users')
                    .update({ role: 'trainer' })
                    .eq('user_id', userId);

                if (userError) alert('Увага: Заявку схвалено, але роль змінити не вдалося.');
            }

            if (appFilter === 'pending') {
                setItems(prev => prev.filter(item => item[idField] !== appId));
            } else {
                fetchData();
            }
            fetchStats();
            alert(`Успішно! Заявка ${action === 'approved' ? 'схвалена' : 'відхилена'}.`);
        } catch (error) {
            alert('Помилка: ' + error.message);
        }
    };

    // --- SORTING ---
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

                if ((activeTab === 'users' || activeTab === 'applications') && sortConfig.key === 'name') {
                    aValue = activeTab === 'users'
                        ? getUserDisplayName(a)
                        : getUserDisplayName(usersLookup[a.user_id]);
                    bValue = activeTab === 'users'
                        ? getUserDisplayName(b)
                        : getUserDisplayName(usersLookup[b.user_id]);
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig, activeTab, usersLookup]);

    // --- DELETE ITEM (FIXED) ---
    const handleDelete = async (idToDelete) => {
        if (!idToDelete) {
            alert("Помилка: Не вдалося визначити ID запису.");
            return;
        }

        if (!window.confirm('Видалити цей запис назавжди? Це незворотня дія.')) return;

        try {
            const { table, idField } = getTableConfig(activeTab);

            // ИСПРАВЛЕНИЕ: Удаляем связи из food_entries перед удалением продукта
            if (activeTab === 'foods') {
                const { error: entriesError } = await supabase
                    .from('food_entries') // 
                    .delete()
                    .eq('food_item_id', idToDelete); // Ссылается на food_item_id

                if (entriesError) console.warn("Could not delete related food entries:", entriesError);
            }

            // ИСПРАВЛЕНИЕ: Аналогично для тренировок
            if (activeTab === 'workouts') {
                const { error: wEntriesError } = await supabase
                    .from('workout_entries') // [cite: 45]
                    .delete()
                    .eq('workout_item_id', idToDelete);

                if (wEntriesError) console.warn("Could not delete related workout entries:", wEntriesError);
            }

            // Каскадное удаление для пользователей
            if (activeTab === 'users') {
                const { error: foodError } = await supabase.from('food_items').delete().eq('created_by', idToDelete).maybeSingle();
                const { error: appError } = await supabase.from('trainer_applications').delete().eq('user_id', idToDelete);
                await supabase.from('user_profiles').delete().eq('user_id', idToDelete);
            }

            // Удаляем саму запись
            const { error } = await supabase.from(table).delete().eq(idField, idToDelete);

            if (error) throw error;

            // Обновляем UI
            setItems(items.filter(item => item[idField] !== idToDelete));

            if (activeTab === 'foods') fetchDashboardData();
            fetchStats();

        } catch (error) {
            console.error(error);
            alert("Помилка при видаленні: " + error.message);
        }
    };

    // --- SAVE ITEM (ADD/EDIT) ---
    const handleSaveItem = async () => {
        try {
            const { table, idField } = getTableConfig(activeTab);

            if (activeTab === 'foods' && !formData.name) { alert('Введіть назву'); return; }
            if (activeTab === 'workouts' && !formData.name) { alert('Введіть назву'); return; }

            // Подготавливаем данные СТРОГО ПО PDF
            let dataToSend = {};

            if (activeTab === 'foods') {
                dataToSend = {
                    name: formData.name,
                    calories: formData.calories || 0,
                    proteins: formData.proteins || 0,
                    fats: formData.fats || 0,
                    carbohydrates: formData.carbohydrates || 0
                };
            } else if (activeTab === 'workouts') {
                dataToSend = {
                    name: formData.name,
                    calories_per_hour: formData.calories_per_hour || 0
                };
            } else {
                dataToSend = { ...formData };
            }

            let result;
            if (editingItem) {
                // UPDATE
                result = await supabase
                    .from(table)
                    .update(dataToSend)
                    .eq(idField, editingItem[idField])
                    .select();
            } else {
                // INSERT
                result = await supabase
                    .from(table)
                    .insert([dataToSend])
                    .select();
            }

            if (result.error) throw result.error;

            const savedItem = result.data[0];
            if (editingItem) {
                setItems(items.map(i => i[idField] === editingItem[idField] ? savedItem : i));
            } else {
                setItems([...items, savedItem]);
            }
            setIsModalOpen(false);
            fetchStats();
            if (activeTab === 'foods') fetchDashboardData();
        } catch (error) {
            console.error(error);
            alert('Помилка збереження: ' + error.message);
        }
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        if (item && activeTab === 'workouts') {
            setFormData({
                ...item,
                calories_per_hour: item.calories_per_hour
            });
        } else {
            setFormData(item ? { ...item } : {});
        }
        setIsModalOpen(true);
    };

    // --- VIEW/EDIT USER ---
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
            if (activeTab === 'users') {
                setItems(items.map(u => u.user_id === selectedUser.user_id ? { ...u, role: userRole, status: userStatus } : u));
            }
            alert('Користувача оновлено!');
            setIsUserModalOpen(false);
        } catch (error) { alert(error.message); }
    };

    // --- HELPERS ---
    function getUserDisplayName(user) {
        if (!user) return 'Користувач (ID...)';
        if (user.name) return user.name;
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.full_name) return user.full_name;
        if (user.email) return user.email;
        return `ID: ${user.user_id?.substring(0, 6)}`;
    };

    const getItemId = (item) => {
        const { idField } = getTableConfig(activeTab);
        return item[idField];
    };

    const filteredItems = sortedItems.filter(item => {
        const term = searchTerm.toLowerCase();
        let searchString = '';

        if (activeTab === 'applications') {
            if (!item.user_id) return false;
            const user = usersLookup[item.user_id];
            searchString = (user ? getUserDisplayName(user) + user.email : item.user_id).toLowerCase();
        } else {
            searchString = (item.name || getUserDisplayName(item) || '').toLowerCase() + (item.email || '').toLowerCase();
        }

        return searchString.includes(term);
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* HEADER */}
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
                {/* TABS */}
                <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={LayoutDashboard} label="Головна" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Користувачі" />
                    <TabButton active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} icon={FileText} label="Заявки" badge={stats.pendingTrainers} />
                    <TabButton active={activeTab === 'foods'} onClick={() => setActiveTab('foods')} icon={Utensils} label="Продукти" />
                    <TabButton active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={Activity} label="Вправи" />
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in space-y-8">
                        {/* Stats */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Огляд системи</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard title="Всього користувачів" value={stats.users} icon={Users} color="blue" />
                                <StatCard title="Заявок на тренера" value={stats.pendingTrainers} icon={FileText} color="orange" />
                                <StatCard title="Продуктів у базі" value={stats.foods} icon={Utensils} color="emerald" />
                                <StatCard title="Типів тренувань" value={stats.workouts} icon={Activity} color="purple" />
                            </div>
                        </div>

                        {/* Grid Dashboard */}
                        <div>
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Меню FatBeaches</h3>
                                    <p className="text-slate-500 text-sm">Останні додані страви</p>
                                </div>
                                <button onClick={() => setActiveTab('foods')} className="text-blue-600 font-bold text-sm hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                                    Перейти до продуктів →
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {dashboardDishes.map((dish, index) => (
                                    <div key={dish.food_item_id || index} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={() => setActiveTab('foods')}>
                                        <div className="h-48 bg-slate-200 rounded-xl relative overflow-hidden mb-4">
                                            <img
                                                src={dish.image_url || foodImages[index % foodImages.length]}
                                                alt={dish.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <span className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-sm flex items-center gap-1">
                                                <Utensils size={10} className="text-orange-500" />
                                                {dish.calories} ккал
                                            </span>
                                        </div>
                                        <div className="px-1">
                                            <h4 className="font-bold text-slate-800 text-lg mb-2 truncate" title={dish.name}>{dish.name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <div className="flex-1 text-center border-r border-slate-200">
                                                    <span className="block font-bold text-slate-700">Б</span> {dish.proteins}
                                                </div>
                                                <div className="flex-1 text-center border-r border-slate-200">
                                                    <span className="block font-bold text-slate-700">Ж</span> {dish.fats}
                                                </div>
                                                <div className="flex-1 text-center">
                                                    <span className="block font-bold text-slate-700">В</span> {dish.carbohydrates}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div
                                    onClick={() => { setActiveTab('foods'); openModal(null); }}
                                    className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer h-full min-h-[280px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-bold text-sm">Додати страву</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LIST TABLES --- */}
                {activeTab !== 'overview' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Пошук..."
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {activeTab === 'applications' && (
                                    <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                                        <button onClick={() => setAppFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${appFilter === 'pending' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}>В очікуванні</button>
                                        <button onClick={() => setAppFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${appFilter === 'all' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Всі</button>
                                    </div>
                                )}
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
                                                        {activeTab === 'applications' ? 'Кандидат / Дата' : 'Назва / Email'}
                                                        <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </th>
                                                <th className="p-5 text-xs font-black text-slate-400 uppercase">
                                                    {activeTab === 'applications' ? 'Текст заявки / Статус' : 'Деталі / Статус'}
                                                </th>
                                                <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Дії</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredItems.map((item) => {
                                                const applicant = activeTab === 'applications' ? usersLookup[item.user_id] : null;
                                                const itemId = getItemId(item);

                                                return (
                                                    <tr key={itemId} className="hover:bg-slate-50/80 transition-colors group">

                                                        <td className="p-5 align-top w-1/4">
                                                            {activeTab === 'applications' ? (
                                                                <div>
                                                                    <div className="font-bold text-slate-700 text-base">
                                                                        {applicant ? getUserDisplayName(applicant) : 'Завантаження...'}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 mt-1">
                                                                        {applicant?.email || `UID: ${item.user_id?.substring(0, 8)}...`}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-2 bg-slate-50 w-fit px-2 py-1 rounded">
                                                                        <Calendar size={10} />
                                                                        {new Date(item.submitted_at || item.created_at || Date.now()).toLocaleDateString('uk-UA')}
                                                                    </div>
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

                                                        <td className="p-5 align-top">
                                                            {activeTab === 'applications' && (
                                                                <div className="space-y-3">
                                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic leading-relaxed relative">
                                                                        <span className="relative z-10">{item.credentials_details || 'Текст заявки відсутній'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${item.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                                                item.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                                    'bg-red-50 text-red-600 border-red-200'
                                                                            }`}>
                                                                            {item.status === 'pending' ? 'Очікує розгляду' : item.status === 'approved' ? 'Схвалено' : 'Відхилено'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {activeTab === 'foods' && (
                                                                <div className="flex flex-wrap gap-2 text-xs font-bold">
                                                                    <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md border border-orange-100">{item.calories} ккал</span>
                                                                    {item.proteins > 0 && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Б: {item.proteins}</span>}
                                                                    {item.fats > 0 && <span className="bg-yellow-50 text-yellow-600 px-2 py-1 rounded-md">Ж: {item.fats}</span>}
                                                                    {item.carbohydrates > 0 && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">В: {item.carbohydrates}</span>}
                                                                </div>
                                                            )}

                                                            {activeTab === 'workouts' && (
                                                                <div className="flex flex-wrap gap-2 text-xs font-bold">
                                                                    <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded-md border border-purple-100">
                                                                        {item.calories_per_hour ? item.calories_per_hour : 0} ккал/год
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {activeTab === 'users' && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.role === 'admin' ? 'bg-purple-100 text-purple-600' : item.role === 'trainer' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{item.role || 'customer'}</span>
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'banned' ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.status || 'Active'}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="p-5 text-right align-top">
                                                            <div className="flex justify-end gap-2">
                                                                {activeTab === 'applications' && item.status === 'pending' && (
                                                                    <div className="flex flex-col gap-2">
                                                                        <button onClick={() => handleApplication(itemId, item.user_id, 'approved')} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 w-32">
                                                                            <Check size={14} /> СХВАЛИТИ
                                                                        </button>
                                                                        <button onClick={() => handleApplication(itemId, item.user_id, 'rejected')} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all w-32">
                                                                            <XOctagon size={14} /> ВІДХИЛИТИ
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {activeTab === 'users' && (
                                                                    <button onClick={() => handleViewUser(item)} className="p-2 bg-white border hover:border-blue-300 hover:text-blue-600 rounded-lg text-slate-400 transition-all"><Eye size={16} /></button>
                                                                )}

                                                                {(activeTab === 'foods' || activeTab === 'workouts') && (
                                                                    <button onClick={() => openModal(item)} className="p-2 bg-white border hover:border-blue-300 hover:text-blue-600 rounded-lg text-slate-400 transition-all"><Edit2 size={16} /></button>
                                                                )}

                                                                <button
                                                                    onClick={() => handleDelete(itemId)}
                                                                    className="p-2 bg-white border hover:border-red-300 hover:text-red-600 rounded-lg text-slate-400 transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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

            {/* --- MODALS --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'Редагувати' : 'Додати'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">Назва</label>
                                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            {activeTab === 'foods' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500">Калорії</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.calories || ''} onChange={e => setFormData({ ...formData, calories: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Білки</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.proteins || ''} onChange={e => setFormData({ ...formData, proteins: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Жири</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.fats || ''} onChange={e => setFormData({ ...formData, fats: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500">Вуглеводи</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.carbohydrates || ''} onChange={e => setFormData({ ...formData, carbohydrates: e.target.value })} /></div>
                                </div>
                            )}

                            {activeTab === 'workouts' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Калорії (за годину)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-slate-50 rounded-xl outline-none"
                                        placeholder="Наприклад: 500"
                                        value={formData.calories_per_hour || ''}
                                        onChange={e => setFormData({ ...formData, calories_per_hour: e.target.value })}
                                    />
                                </div>
                            )}

                            <button onClick={handleSaveItem} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4 flex justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><Save size={20} /> Зберегти</button>
                        </div>
                    </div>
                </div>
            )}

            {isUserModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col md:flex-row gap-8 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsUserModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
                        <div className="flex-1">
                            <h3 className="text-xl font-black mb-1">{getUserDisplayName(selectedUser)}</h3>
                            <p className="text-sm text-slate-500 mb-4">{selectedUser.email}</p>
                            {loadingProfile ? <p>Завантаження...</p> : userProfile ? (
                                <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                                    <div className="flex gap-2"><span className="font-bold">Вага:</span> {userProfile.weight_kg} кг</div>
                                    <div className="flex gap-2"><span className="font-bold">Зріст:</span> {userProfile.height_cm} см</div>
                                    <div className="flex gap-2"><span className="font-bold">Ціль:</span> {userProfile.goal}</div>
                                </div>
                            ) : <p className="text-slate-400 border p-2 rounded text-center text-sm">Профіль не заповнено</p>}
                        </div>
                        <div className="flex-1 border-l pl-8 space-y-4">
                            <h4 className="font-bold flex items-center gap-2 text-slate-800"><Edit2 size={16} /> Редагувати доступ</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Роль</label>
                                <div className="flex gap-2">{['customer', 'trainer', 'admin'].map(r => <button key={r} onClick={() => setUserRole(r)} className={`px-3 py-1.5 rounded-lg capitalize border font-medium transition-all ${userRole === r ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{r}</button>)}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Статус</label>
                                <div className="flex gap-2">{['active', 'banned'].map(s => <button key={s} onClick={() => setUserStatus(s)} className={`px-3 py-1.5 rounded-lg capitalize border font-medium transition-all ${userStatus === s ? (s === 'active' ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md' : 'bg-red-500 border-red-500 text-white shadow-red-200 shadow-md') : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{s}</button>)}</div>
                            </div>
                            <button onClick={handleUpdateUser} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex justify-center gap-2 transition-all shadow-xl shadow-slate-200 mt-4"><Save size={18} /> Зберегти</button>
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
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
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
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${active ? 'bg-slate-900 text-white shadow-md scale-105' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}>
        {React.createElement(icon, { size: 16 })}
        {label}
        {badge > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">{badge}</span>}
    </button>
);

export default AdminDashboard;