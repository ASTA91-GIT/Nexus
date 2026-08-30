"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { finalCtaContent } from '@/content/final-cta';
import { ctaReveal, sectionRevealViewport } from '@/lib/motion';

export default function FinalCTASection() {
  return (
    <section className="py-section bg-nexus-bg-base relative z-20 border-t border-nexus-glass-border overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[600px] bg-nexus-accent-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        className="max-w-4xl mx-auto px-6 text-center relative z-10"
        initial="hidden"
        whileInView="show"
        viewport={sectionRevealViewport}
        variants={ctaReveal}
      >
        <h2 className="text-display-md md:text-display-lg font-display font-black text-nexus-text-primary tracking-tight mb-6">
          {finalCtaContent.heading}
        </h2>
        <p className="text-nexus-text-secondary font-body font-light text-xl mb-12 max-w-2xl mx-auto">
          {finalCtaContent.description}
        </p>

        <Link 
          href={finalCtaContent.cta.href} 
          className="inline-flex items-center justify-center gap-4 px-10 py-5 rounded-full bg-white text-black font-display font-black tracking-widest hover:bg-gray-200 transition-all duration-300 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] group"
        >
          {finalCtaContent.cta.label.replace('→', '').trim()}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </motion.div>
    </section>
  );
}
