import { ShoppingCart, Package, AlertTriangle } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

export default function ItemCard({ item, eventStatus, onBuy, isPurchasing, hasPurchased }) {
  const isSoldOut = item.currentStock === 0;
  const isLive = eventStatus === 'Live';
  const stockPercent = item.initialStock > 0
    ? Math.round((item.currentStock / item.initialStock) * 100)
    : 0;

  const stockColor =
    stockPercent > 50 ? 'bg-green-500' :
    stockPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  const canBuy = isLive && !isSoldOut && !isPurchasing && !hasPurchased;

  return (
    <div className={`card p-5 flex flex-col gap-4 transition-all duration-300 ${isSoldOut ? 'opacity-60' : 'hover:border-zinc-700'}`}>
      {/* Item image */}
      <div className="relative h-40 bg-zinc-800 rounded-xl overflow-hidden">
        {item.coverPhoto ? (
          <img src={item.coverPhoto} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-zinc-600" />
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2">
              <span className="text-red-400 font-display font-bold text-lg uppercase tracking-widest">Sold Out</span>
            </div>
          </div>
        )}
        {hasPurchased && !isSoldOut && (
          <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/30 rounded-lg px-2 py-1">
            <span className="text-green-400 text-xs font-semibold">Purchased</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2">
        <h3 className="font-display font-semibold text-white text-base leading-snug">{item.name}</h3>

        <div className="flex items-center justify-between">
          <span className="text-orange-400 font-display font-bold text-2xl">
            ${item.price.toFixed(2)}
          </span>
          {isLive && !isSoldOut && (
            <span className="text-zinc-400 text-sm tabular-nums">
              <span className={`font-semibold ${item.currentStock < 20 ? 'text-red-400' : 'text-zinc-300'}`}>
                {item.currentStock.toLocaleString()}
              </span>{' '}
              left
            </span>
          )}
        </div>

        {/* Stock bar */}
        {isLive && (
          <div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full stock-bar-fill transition-all duration-700 ${isSoldOut ? 'bg-red-500 w-full' : stockColor}`}
                style={{ width: isSoldOut ? '100%' : `${100 - stockPercent}%` }}
              />
            </div>
            {item.currentStock < 20 && !isSoldOut && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-400 text-xs font-medium">Only {item.currentStock} left!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buy button */}
      {isLive && (
        <button
          onClick={() => canBuy && onBuy(item._id)}
          disabled={!canBuy}
          className={`
            w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-sm
            transition-all duration-200 active:scale-95
            ${isSoldOut
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : hasPurchased
              ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-not-allowed'
              : isPurchasing
              ? 'bg-orange-500/50 text-orange-200 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30'
            }
          `}
        >
          {isPurchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : isSoldOut ? (
            'Sold Out'
          ) : hasPurchased ? (
            '✓ Purchased'
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Buy Now — ${item.price.toFixed(2)}
            </>
          )}
        </button>
      )}
    </div>
  );
}