import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login",
    description: "Login page",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    // Determine current step from pathname if needed, or let each page handle
    return (
        <div suppressHydrationWarning className="flex bg-background h-screen overflow-hidden">
            <div suppressHydrationWarning className="flex-1 p-8 pt-10 px-[6.93777%] w-full h-full bg-white overflow-y-auto relative">

                {children}

            </div>
            <div suppressHydrationWarning style={{
                backgroundImage: "url('/layout.png')"
            }} className='flex-1 bg-[#E6F8F6] h-full p-8 flex flex-col bg-no-repeat bg-contain bg-center '></div>

        </div>
    );
}