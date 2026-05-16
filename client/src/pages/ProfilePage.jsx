import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchasesAPI, usersAPI, authAPI } from '../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { User, ShoppingBag, Lock, CheckCircle, XCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    purchasesAPI.getMyOrders()
      .then(({ data }) => setOrders(data.orders))
      .catch(() => toast.error('Failed to load orders.'))
      .finally(() => setOrdersLoading(false));
  }, []);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameLoading(true);
    try {
      await usersAPI.updateProfile({ name });
      updateUser({ name });
      toast.success('Display name updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setPassLoading(true);
    try {
      await authAPI.changePassword(passwords);
      toast.success('Password changed successfully.');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed.');
    } finally {
      setPassLoading(false);
    }
  };

  const tabs = [
    { id: 'orders', label: 'Order History', icon: ShoppingBag },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-xl font-display font-bold text-orange-400 border border-zinc-700">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{user?.name}</h1>
            <p className="text-zinc-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-8 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === id
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Order History ─────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {ordersLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)
          ) : orders.length === 0 ? (
            <div className="card p-12 text-center">
              <ShoppingBag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No orders yet. Join a live event to start shopping.</p>
            </div>
          ) : orders.map((order) => (
            <div key={order._id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  order.status === 'Confirmed' ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {order.status === 'Confirmed'
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{order.itemId?.name}</p>
                  <p className="text-zinc-500 text-xs">{order.eventId?.name}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-bold text-orange-400">${order.priceAtPurchase?.toFixed(2)}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  order.status === 'Confirmed'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Profile ───────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateName} className="card p-8 max-w-md space-y-5">
          <h2 className="font-display text-xl font-bold text-white">Update Profile</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Display Name</label>
            <input type="text" className="input-field" value={name}
              onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Email address</label>
            <input type="email" className="input-field opacity-60 cursor-not-allowed" value={user?.email} disabled />
            <p className="text-zinc-600 text-xs mt-1">Email cannot be changed.</p>
          </div>
          <button type="submit" disabled={nameLoading} className="btn-primary">
            {nameLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* ── Security ──────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="card p-8 max-w-md space-y-5">
          <h2 className="font-display text-xl font-bold text-white">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Current Password</label>
            <input type="password" className="input-field" placeholder="••••••••"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">New Password</label>
            <input type="password" className="input-field" placeholder="At least 6 characters"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
          </div>
          <button type="submit" disabled={passLoading} className="btn-primary">
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}