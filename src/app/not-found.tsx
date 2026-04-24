"use client"
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, Coffee, Zap, Star } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NotFound = () => {
    const location = usePathname();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        logger.error(
            "404 Error: User attempted to access non-existent route:",
            location
        );
    }, [location]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const FloatingIcon = ({ icon: Icon, delay }: { icon: any, delay: string }) => (
        <div
            className={`absolute animate-bounce opacity-90 text-primary/30`}
            style={{
                animationDelay: delay,
                animationDuration: '3s'
            }}
        >
            <Icon className="h-8 w-8" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4 overflow-hidden relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/75 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/75 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-destructive/75 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Floating icons */}
            <FloatingIcon icon={Coffee} delay="0s" />
            <FloatingIcon icon={Zap} delay="1s" />
            <FloatingIcon icon={Star} delay="2s" />

            {/* Mouse follower effect */}
            <div
                className="fixed w-4 h-4 bg-primary/20 rounded-full blur-sm pointer-events-none z-10 transition-transform duration-150 ease-out"
                style={{
                    left: mousePosition.x - 8,
                    top: mousePosition.y - 8,
                    transform: isHovering ? 'scale(2)' : 'scale(1)'
                }}
            />

            <div className="text-center relative z-20">
                {/* Main 404 Display */}


                {/* Interactive Card */}
                <Card
                    className="max-w-md mx-auto shadow-2xl border-0 bg-card/80 backdrop-blur-sm hover-scale animate-scale-in"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <CardContent className="p-8 space-y-6">
                        {/* Animated title */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                                Oops! You&apos;ve discovered the void
                            </h1>
                            <p className="text-muted-foreground">
                                The page you&apos;re looking for seems to have wandered off into the digital wilderness.
                            </p>
                        </div>

                        {/* Current route display */}
                        <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono border-l-4 border-destructive">
                            <span className="text-muted-foreground">Attempted route: </span>
                            <span className="text-destructive font-semibold">{location}</span>
                        </div>

                        {/* Interactive buttons */}
                        <div className="space-y-3">
                            <Link href="/" className="block">
                                <Button className="w-full group hover-scale" size="lg">
                                    <Home className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                                    Take me home
                                </Button>
                            </Link>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="group hover-scale"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Go back
                                </Button>

                                <Link href="/docs">
                                    <Button variant="ghost" className="w-full group hover-scale">
                                        <Search className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                                        Explore
                                    </Button>
                                </Link>
                            </div>
                        </div>


                    </CardContent>
                </Card>

                {/* Additional help text */}
                <p className="mt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    Lost? Try checking the URL for typos or{' '}
                    <Link href="/contact" className="text-primary hover:underline font-medium">
                        contact us
                    </Link>{' '}
                    if you believe this is an error.
                </p>
            </div>
        </div>
    );
};

export default NotFound;
