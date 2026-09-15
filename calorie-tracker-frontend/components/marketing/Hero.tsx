"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from "lucide-react";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.13,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 -z-20 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)] opacity-45"
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-1/3 -z-10 h-[34rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.16),rgba(15,118,110,0.07)_35%,transparent_70%)] blur-2xl"
        aria-hidden
      />

      <motion.div
        className="mx-auto flex w-full max-w-5xl flex-col items-center text-center"
        variants={shouldReduceMotion ? undefined : containerVariants}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-white/75 px-4 py-2 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden />
            <span className="bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-[0.7rem] font-bold uppercase tracking-[0.24em] text-transparent">
              Nutrition Intelligence
            </span>
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="mt-8 max-w-5xl text-balance text-5xl font-extrabold tracking-[-0.045em] text-zinc-900 md:text-7xl md:leading-[1.02]"
        >
          Understand every meal.{" "}
          <span className="bg-gradient-to-r from-zinc-900 via-teal-700 to-teal-600 bg-clip-text text-transparent">
            Own your progress.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-7 max-w-2xl text-balance text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8"
        >
          Turn everyday nutrition into clear, actionable insight with intelligent tracking,
          focused goals, and analytics designed to keep you moving forward.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
        >
          <Link
            href="/register"
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(13,148,136,0.75)] transition duration-300 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-[0_16px_38px_-12px_rgba(13,148,136,0.9)] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 sm:w-auto"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-6 text-sm font-semibold text-zinc-700 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 sm:w-auto"
          >
            Sign in to Dashboard
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-zinc-600"
        >
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-600" aria-hidden />
            Focused health analytics
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden />
            Private by design
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
