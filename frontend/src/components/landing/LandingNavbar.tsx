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
          <nav className="hidden md:flex items-center gap-8 text-sm font-display font-medium text-nexus-text-secondary">
            {navContent.links.map((link, idx) => (
              <a key={idx} href={link.href} className="hover:text-white transition-colors tracking-wide">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <Link 
              href={navContent.signIn.href}
              className="hidden md:block text-sm font-display font-medium text-nexus-text-secondary hover:text-white transition-colors tracking-wide"
            >
              {navContent.signIn.label}
            </Link>
            <Link 
              href={navContent.cta.href} 
              className="px-6 py-2.5 rounded-full text-sm font-display font-bold bg-nexus-accent-primary hover:bg-[#2563EB] text-white shadow-glow-blue hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300 flex items-center gap-2 group tracking-wide"
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
