import { Link } from 'react-router-dom';
import { Clock, Package, ChevronRight, Lock, CheckCircle } from 'lucide-react';
import useCountdown from '../hooks/useCountdown';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  if (status === 'Live') {
    return (
      <span className="badge-live">
        <span className="live-dot" />
        Live
      </span>
    );
  }
  if (status === 'Locked') {
    return (
      <span className="badge-locked">
        <Lock className="w-3 h-3" />
        Upcoming
      </span>
    );
  }
  return (
    <span className="badge-closed">
      <CheckCircle className="w-3 h-3" />
      Closed
    </span>
  );
};

const pad = (n) => String(n).padStart(2, '0');

export default function EventCard({ event }) {
  const countdown = useCountdown(event.status === 'Locked' ? event.goLiveTime : null);

  const totalStock = event.items?.reduce((s, i) => s + (i.initialStock || 0), 0) || 0;
  const currentStock = event.items?.reduce((s, i) => s + (i.currentStock || 0), 0) || 0;
  const soldPercent = totalStock > 0 ? Math.round(((totalStock - currentStock) / totalStock) * 100) : 0;

  return (
    <Link
      to={`/events/${event._id}`}
      className="card group flex flex-col overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/30 animate-slide-up"
    >
      {/* Cover image */}
      <div className="relative h-44 bg-zinc-800 overflow-hidden">
        {event.coverPhoto ? (
          <img src={event.coverPhoto} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Package className="w-12 h-12 text-zinc-600" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.status} />
        </div>
        {event.status === 'Live' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-display font-semibold text-white text-lg leading-tight group-hover:text-orange-400 transition-colors line-clamp-2">
            {event.name}
          </h3>
          <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(event.goLiveTime), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>

        {/* Countdown for locked events */}
        {event.status === 'Locked' && !countdown?.isExpired && (
          <div className="bg-zinc-800/60 rounded-xl p-3 flex items-center justify-between">
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Opens in</span>
            <span className="font-mono text-orange-400 font-bold tabular-nums text-sm">
              {countdown.days > 0 && `${countdown.days}d `}
              {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
        )}

        {/* Stock bar for live events */}
        {event.status === 'Live' && totalStock > 0 && (
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>{currentStock.toLocaleString()} remaining</span>
              <span className="text-orange-400">{soldPercent}% sold</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full stock-bar-fill"
                style={{ width: `${soldPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
          <span className="text-zinc-500 text-sm">
            {event.items?.length || 0} {event.items?.length === 1 ? 'item' : 'items'}
          </span>
          <div className="flex items-center gap-1 text-orange-400 text-sm font-medium group-hover:gap-2 transition-all">
            View <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}