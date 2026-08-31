"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { navContent } from "@/content/nav";
import { navEntrance, navGlassVariants } from "@/lib/motion";

export default function LandingNavbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <motion.header 
      initial="hidden"
      animate="show"
      variants={navEntrance}
      className="fixed top-0 w-full z-50 transition-colors duration-300 border-b"
    >
      <motion.div 
        className="w-full"
        animate={isScrolled ? "scrolled" : "top"}
        variants={navGlassVariants}
      >
        <div className="max-w-content mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center font-display font-bold text-xl tracking-wider text-white shadow-glow-blue">
              N
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-white">
              {navContent.logo}
            </span>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-10 text-[11px] font-display font-bold uppercase tracking-[0.15em] text-nexus-text-secondary">
            {navContent.links.map((link, idx) => (
              <a key={idx} href={link.href} className="group relative py-2 text-[var(--text-secondary)] hover:text-white transition-colors duration-300">
                {link.label}
                <div className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2"></div>
                <div className="absolute -bottom-1 left-1/2 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2"></div>
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <Link 
              href={navContent.signIn.href}
              className="hidden md:block text-[11px] font-display font-bold uppercase tracking-[0.1em] text-nexus-text-secondary hover:text-white transition-colors duration-300"
            >
              {navContent.signIn.label}
            </Link>
            <Link 
              href={navContent.cta.href} 
              className="px-6 py-2.5 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-nexus-accent-primary hover:bg-[#2563EB] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.8)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center gap-2 group"
            >
              {navContent.cta.label.replace('→', '').trim()}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
