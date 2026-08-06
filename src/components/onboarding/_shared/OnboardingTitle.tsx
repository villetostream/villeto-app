const OnboardingTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="max-w-[620px]">
    <h1 className="text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[#0b100e]">{title}</h1>
    <p className="mt-3 text-[14px] leading-6 text-[#68726d]">{subtitle}</p>
  </div>
);

export default OnboardingTitle;
