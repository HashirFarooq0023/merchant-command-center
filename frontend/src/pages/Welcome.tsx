import { useEffect, useState } from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Zap, Bot, Database, ShoppingCart } from "lucide-react";
import { motion, Variants } from "framer-motion";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";

export default function Welcome() {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadFull(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    const cardVariants: Variants = {
        hidden: { x: 50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100, damping: 20 }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark p-4 relative overflow-hidden">
            {init && (
                <Particles
                    id="tsparticles"
                    className="absolute inset-0 z-0"
                    options={{
                        background: {
                            color: {
                                value: "transparent",
                            },
                        },
                        fpsLimit: 60,
                        interactivity: {
                            events: {
                                onHover: {
                                    enable: true,
                                    mode: "grab",
                                },
                            },
                            modes: {
                                grab: {
                                    distance: 200,
                                    links: {
                                        opacity: 1,
                                    },
                                },
                            },
                        },
                        particles: {
                            color: {
                                value: "#ffffff",
                            },
                            links: {
                                color: "#ffffff",
                                distance: 150,
                                enable: true,
                                opacity: 0.2,
                                width: 1,
                            },
                            move: {
                                direction: "none",
                                enable: true,
                                outModes: {
                                    default: "bounce",
                                },
                                random: false,
                                speed: 1,
                                straight: false,
                            },
                            number: {
                                density: {
                                    enable: true,
                                    width: 800,
                                },
                                value: 150,
                            },
                            opacity: {
                                value: 0.5,
                            },
                            shape: {
                                type: "circle",
                            },
                            size: {
                                value: { min: 1, max: 4 },
                            },
                        },
                        detectRetina: true,
                    }}
                />
            )}

            {/* Background Particles/Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                {/* Left Side: Hero Text */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6 text-center md:text-left"
                >
                    <motion.div variants={itemVariants} className="flex items-center justify-center md:justify-start gap-3 mb-8">
                        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                            <Zap className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Commerce AI
                        </h1>
                    </motion.div>

                    <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                        The Ultimate <br />
                        <span className="text-primary glow-text">Chat Center</span><br />
                        for Your Store
                    </motion.h2>

                    <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-md mx-auto md:mx-0">
                        Manage your products, engage customers with AI, and oversee all WhatsApp conversations from a single, powerful dashboard.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                        <SignedOut>
                            <SignInButton mode="modal" fallbackRedirectUrl="/">
                                <Button size="lg" className="gradient-primary text-base font-medium min-w-[140px] hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/25">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal" fallbackRedirectUrl="/">
                                <Button size="lg" variant="outline" className="text-base font-medium min-w-[140px] bg-card/50 backdrop-blur border-border hover:bg-card hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-accent/10">
                                    Sign Up
                                </Button>
                            </SignUpButton>
                        </SignedOut>
                    </motion.div>
                </motion.div>

                {/* Right Side: Feature Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4"
                >
                    <motion.div variants={cardVariants} className="glass-card p-6 rounded-2xl flex items-start gap-4 transform transition-all hover:scale-105 hover:border-primary/50">
                        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground mb-1">Knowledge Base</h3>
                            <p className="text-sm text-muted-foreground">Vectorize your entire product catalog instantly for AI retrieval.</p>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants} className="glass-card p-6 rounded-2xl flex items-start gap-4 transform transition-all hover:scale-105 hover:border-accent/50 ml-0 md:ml-8 relative z-10">
                        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                            <Bot className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground mb-1">AI Agent</h3>
                            <p className="text-sm text-muted-foreground">Test your AI assistant locally before deploying to WhatsApp.</p>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants} className="glass-card p-6 rounded-2xl flex items-start gap-4 transform transition-all hover:scale-105 hover:border-primary/50">
                        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground mb-1">Order Management</h3>
                            <p className="text-sm text-muted-foreground">Extract and view Cash on Delivery orders placed via chat.</p>
                        </div>
                    </motion.div>
                </motion.div>

            </div>
        </div>
    );
}
