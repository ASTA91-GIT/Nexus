"use client";
import { motion } from "framer-motion";
import {
  statusPill, headlineEntrance, fadeUp,
  buttonStagger, buttonItem, staggerContainer,
} from "@/lib/motion";
import { heroContent } from "@/content/hero";
import NexusHeroCanvas from "./NexusHeroCanvas";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-nexus-bg-base">
      <div className="absolute inset-0 bg-radial-core opacity-60" />
      <div className="relative z-10 mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-6 py-section lg:grid-cols-2">
        <motion.div initial="hidden" animate="show" variants={staggerContainer(0.15)}>
          <motion.div variants={statusPill} className="mb-6 flex items-center gap-2 font-mono text-eyebrow text-nexus-accent-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-nexus-accent-secondary animate-pulse-slow" />
            {heroContent.status.label}
          </motion.div>

          <motion.h1 variants={headlineEntrance} className="font-display text-hero text-nexus-text-primary">
            {heroContent.heading}
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-4 font-display text-display-md text-nexus-text-secondary">
            {heroContent.subheading[0]}<br />{heroContent.subheading[1]}
          </motion.p>

          <motion.p variants={fadeUp} className="mt-6 max-w-md text-base text-nexus-text-secondary">
            {heroContent.description}
          </motion.p>

          <motion.div variants={buttonStagger} initial="hidden" animate="show" className="mt-10 flex flex-wrap gap-4">
            <motion.a variants={buttonItem} href={heroContent.primaryCta.href}
              className="rounded-full bg-nexus-accent-primary px-8 py-3 font-display text-sm text-white shadow-glow-blue transition hover:brightness-110">
              {heroContent.primaryCta.label}
            </motion.a>
            <motion.a variants={buttonItem} href={heroContent.secondaryCta.href}
              className="glass-panel rounded-full px-8 py-3 font-display text-sm text-nexus-text-primary transition">
              {heroContent.secondaryCta.label}
            </motion.a>
          </motion.div>
        </motion.div>

        <div className="relative h-[480px] lg:h-[640px]">
          <NexusHeroCanvas />
        </div>
      </div>
    </section>
  );
}
