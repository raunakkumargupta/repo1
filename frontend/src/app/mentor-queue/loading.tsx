import { Loader2 } from "lucide-react";

export default function QueueLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-4" />
      <p className="text-slate-500 font-medium">Fetching active queue...</p>
    </div>
  );
}
