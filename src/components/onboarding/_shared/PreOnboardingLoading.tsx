import Image from "next/image";

export default function PreOnboardingLoading({ registration = false }: { registration?: boolean }) {
  return (
    <div className="flex min-h-dvh animate-pulse flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14">
        <Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover opacity-75" priority />
        <span className="h-7 w-14 rounded-full bg-[#edf1ef]" />
      </header>

      <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-6 py-10 sm:px-10 xl:px-14">
        <div className="h-7 w-40 rounded-full bg-[#e7f6f2]" />
        <div className="mt-6 h-11 w-[82%] rounded-[8px] bg-[#e8ecea]" />
        <div className="mt-3 h-5 w-[68%] rounded bg-[#f0f2f1]" />

        <div className="mt-9 space-y-5">
          {registration && (
            <div className="grid grid-cols-2 gap-4">
              <div><div className="mb-2 h-4 w-16 rounded bg-[#edf0ee]" /><div className="h-[52px] rounded-[10px] border border-black/[0.06] bg-[#fafbfa]" /></div>
              <div><div className="mb-2 h-4 w-16 rounded bg-[#edf0ee]" /><div className="h-[52px] rounded-[10px] border border-black/[0.06] bg-[#fafbfa]" /></div>
            </div>
          )}
          <div>
            <div className="mb-2 h-4 w-28 rounded bg-[#edf0ee]" />
            <div className="h-[56px] rounded-[10px] border border-black/[0.06] bg-[#fafbfa]" />
          </div>
          {registration && <div className="h-24 rounded-[11px] border border-black/[0.06] bg-[#fafbfa]" />}
          <div className="h-[54px] rounded-[10px] bg-[#b6e2db]" />
        </div>
      </div>
    </div>
  );
}
