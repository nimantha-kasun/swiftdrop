import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Calendar, Image, Package, Tag, Layers } from 'lucide-react';

export default function AdminEventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    goLiveTime: '',
    coverPhoto: '',
  });

  const [items, setItems] = useState([
    { id: Date.now(), name: '', price: '', stock: '', coverPhoto: '' }
  ]);

  useEffect(() => {
    if (isEdit) {
      eventsAPI.getOne(id)
        .then(({ data }) => {
          const ev = data.event;
          if (ev.status !== 'Locked') {
            toast.error('Only Locked events can be edited.');
            navigate('/admin');
            return;
          }
          // Format for datetime-local input
          const localDate = new Date(ev.goLiveTime);
          const offset = localDate.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(localDate - offset)).toISOString().slice(0, 16);

          setForm({
            name: ev.name,
            goLiveTime: localISOTime,
            coverPhoto: ev.coverPhoto || '',
          });
          // We don't support editing items array through the API currently, 
          // so we don't need to populate them for editing.
        })
        .catch(() => {
          toast.error('Failed to load event details.');
          navigate('/admin');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, isEdit]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), name: '', price: '', stock: '', coverPhoto: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEdit) {
        await eventsAPI.update(id, {
          name: form.name,
          goLiveTime: new Date(form.goLiveTime).toISOString(),
          coverPhoto: form.coverPhoto,
        });
        toast.success('Event updated successfully.');
      } else {
        const payload = {
          name: form.name,
          goLiveTime: new Date(form.goLiveTime).toISOString(),
          coverPhoto: form.coverPhoto,
          items: items.map(i => ({
            name: i.name,
            price: Number(i.price),
            stock: Number(i.stock),
            coverPhoto: i.coverPhoto
          }))
        };
        await eventsAPI.create(payload);
        toast.success('Event created successfully.');
      }
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading event...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <Link to="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-6 group w-fit">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">
          {isEdit ? 'Edit Event' : 'Create Flash Sale'}
        </h1>
        <p className="text-zinc-500 mt-1">
          {isEdit ? 'Update basic event details.' : 'Configure the event details and add inventory items.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="card p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-xl font-bold text-white border-b border-zinc-800 pb-4">Event Details</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Event Name</label>
              <input type="text" className="input-field" placeholder="e.g. Midnight Tech Drop"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required maxLength={120} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" /> Go-Live Date & Time
                </label>
                <input type="datetime-local" className="input-field"
                  value={form.goLiveTime} onChange={e => setForm({...form, goLiveTime: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4 text-zinc-500" /> Cover Photo URL (Optional)
                </label>
                <input type="url" className="input-field" placeholder="https://..."
                  value={form.coverPhoto} onChange={e => setForm({...form, coverPhoto: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* Items (Only visible during creation) */}
        {!isEdit && (
          <div className="card p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h2 className="font-display text-xl font-bold text-white">Inventory Items</h2>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl relative group">
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Item Name
                      </label>
                      <input type="text" className="input-field py-2.5 text-sm" placeholder="e.g. AirPods Pro"
                        value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} required />
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Price ($)
                      </label>
                      <input type="number" step="0.01" min="0.01" className="input-field py-2.5 text-sm font-mono" placeholder="99.99"
                        value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} required />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Stock (100-500)
                      </label>
                      <input type="number" min="100" max="500" className="input-field py-2.5 text-sm font-mono" placeholder="150"
                        value={item.stock} onChange={e => handleItemChange(index, 'stock', e.target.value)} required />
                    </div>
                    
                    <div className="md:col-span-12">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Image URL (Optional)</label>
                      <input type="url" className="input-field py-2.5 text-sm" placeholder="https://..."
                        value={item.coverPhoto} onChange={e => handleItemChange(index, 'coverPhoto', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={submitting} className="btn-primary min-w-[200px]">
            {submitting ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event & Items')}
          </button>
        </div>
      </form>
    </div>
  );
}
