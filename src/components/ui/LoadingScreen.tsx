interface LoadingScreenProps {
  status?: string;
}

export function LoadingScreen({
  status = 'Preparing the 3D scene...',
}: LoadingScreenProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#0b1020] px-6 text-center text-slate-100">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-xs font-medium tracking-[0.25em] text-amber-300/80 uppercase">
          Rishikesh · Bhai Dooj
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
          Initializing 3D Canvas
        </h1>
        <p className="text-sm text-slate-400">{status}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400/90" />
        </div>
      </div>
    </div>
  );
}

