import { useSocket } from "../hooks/useSocket";

/*
 * RealtimeStatus — shows live/reconnecting status.
 * Green dot + "Live" = Socket.IO connected
 * Yellow dot + "Syncing..." = disconnected, polling active
 */
export default function RealtimeStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-800">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isConnected
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
            : "bg-amber-400 animate-pulse"
        }`}
      />
      <span className="text-slate-600 dark:text-slate-300">
        {isConnected ? "Live" : "Syncing..."}
      </span>
    </div>
  );
}
