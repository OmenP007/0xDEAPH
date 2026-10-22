import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060B17] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        {/* Logo officiel depuis public/logo.png */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="0xSeq Logo"
            width={112}
            height={112}
            className="object-contain drop-shadow-[0_8px_24px_rgba(0,102,255,0.3)]"
            priority
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            0x<span className="text-[#0088FF]">Seq</span>
          </h1>
          <p className="text-sm font-medium text-slate-300">
            Plateforme de Séquestre Automatisé • UEMOA (XOF)
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
             Prêt pour l&apos;implémentation de la version Web.
          </p>
        </div>

        <div className="pt-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend Django v2.0 • API Ready
          </span>
        </div>
      </div>
    </main>
  );
}
