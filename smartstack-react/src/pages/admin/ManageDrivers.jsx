import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDrivers } from '../../hooks/useDrivers';
import { useTheme } from '../../context/ThemeContext';
import {
    Users,
    Search,
    UserPlus,
    Trash2,
    Mail,
    Calendar,
    ArrowLeft,
    Loader,
    X,
    AlertTriangle,
    User as UserIcon,
    Filter,
    LogOut,
    Sun,
    Moon,
    Truck
} from 'lucide-react';
import './ManageDrivers.css';

export default function ManageDrivers() {
    const { user, logout, register } = useAuth();
    const { drivers, loading, getAllDrivers, deleteDriver } = useDrivers();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', email: '', password: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        getAllDrivers();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const filteredDrivers = useMemo(() => {
        return drivers.filter(d =>
            d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [drivers, searchQuery]);

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setMessage({ type: '', text: '' });

        if (newDriver.password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            setActionLoading(false);
            return;
        }

        const result = await register(newDriver.email, newDriver.password, newDriver.name, 'driver');

        if (result.success) {
            setMessage({ type: 'success', text: `Driver "${newDriver.name}" added successfully!` });
            setNewDriver({ name: '', email: '', password: '' });
            getAllDrivers(); // Refresh list
            setTimeout(() => {
                setShowAddModal(false);
                setMessage({ type: '', text: '' });
            }, 2000);
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setActionLoading(false);
    };

    const handleDeleteDriver = async (driverId, driverName) => {
        if (window.confirm(`Are you sure you want to remove driver "${driverName}"? This action cannot be undone.`)) {
            setActionLoading(true);
            const result = await deleteDriver(driverId);
            if (result.success) {
                setMessage({ type: 'success', text: `Driver "${driverName}" removed.` });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                setMessage({ type: 'error', text: result.error });
            }
            setActionLoading(false);
        }
    };

    if (loading && drivers.length === 0) {
        return (
            <div className="manage-drivers-page loading-state">
                <Loader size={48} className="spinner" />
                <p>Loading fleet database...</p>
            </div>
        );
    }

    return (
        <div className="manage-drivers-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo" onClick={() => navigate('/admin/dashboard')} style={{ cursor: 'pointer' }}>
                        <Truck size={28} />
                    </span>
                    <h1>SmartStack Pro</h1>
                    <span className="admin-badge">ADMIN</span>
                </div>
                <div className="header-right">
                    <button className="theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <span className="user-info"><UserIcon size={16} /> {user?.name}</span>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main className="manage-main">
                <div className="page-header">
                    <div className="title-section">
                        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                            <ArrowLeft size={18} />
                        </button>
                        <h2><Users size={24} /> Manage Drivers</h2>
                        <span className="driver-count">{drivers.length} registered</span>
                    </div>
                    <button className="add-driver-main-btn" onClick={() => setShowAddModal(true)}>
                        <UserPlus size={18} /> Add New Driver
                    </button>
                </div>

                {message.text && (
                    <div className={`global-message ${message.type}`}>
                        {message.type === 'error' ? <AlertTriangle size={18} /> : <Users size={18} />}
                        {message.text}
                    </div>
                )}

                <div className="controls-bar">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={getAllDrivers} disabled={loading}>
                        {loading ? <Loader size={18} className="spinner" /> : <Filter size={18} />}
                        {loading ? 'Refreshing...' : 'Filter List'}
                    </button>
                </div>

                <div className="drivers-table-container glass">
                    <table className="drivers-table">
                        <thead>
                            <tr>
                                <th>Driver Profile</th>
                                <th>Contact Information</th>
                                <th>Registration Date</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="empty-table">
                                        <UserIcon size={48} />
                                        <p>{searchQuery ? 'No drivers match your search.' : 'No drivers registered yet.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map(driver => (
                                    <tr key={driver.id}>
                                        <td>
                                            <div className="driver-profile-cell">
                                                <div className="driver-avatar-large">
                                                    {driver.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="driver-info-stack">
                                                    <span className="driver-name">{driver.name}</span>
                                                    <span className="driver-role-tag">Standard Driver</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                <div className="contact-item">
                                                    <Mail size={14} /> {driver.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="date-cell">
                                                <Calendar size={14} />
                                                {new Date(driver.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className="delete-driver-btn"
                                                onClick={() => handleDeleteDriver(driver.id, driver.name)}
                                                title="Delete Driver"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Add Driver Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => !actionLoading && setShowAddModal(false)}>
                    <div className="add-driver-modal glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><UserPlus size={22} /> Register Driver</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)} disabled={actionLoading}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddDriver} className="add-driver-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <div className="input-with-icon">
                                    <UserIcon size={18} />
                                    <input
                                        type="text"
                                        value={newDriver.name}
                                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                                        placeholder="E.g. John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input
                                        type="email"
                                        value={newDriver.email}
                                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Access Password</label>
                                <div className="input-with-icon">
                                    <AlertTriangle size={18} />
                                    <input
                                        type="password"
                                        value={newDriver.password}
                                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {message.text && message.type === 'error' && (
                                <div className="modal-error-msg">{message.text}</div>
                            )}
                            {message.text && message.type === 'success' && (
                                <div className="modal-success-msg">{message.text}</div>
                            )}

                            <button type="submit" className="submit-driver-btn" disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : <><UserPlus size={18} /> Confirm Registration</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
