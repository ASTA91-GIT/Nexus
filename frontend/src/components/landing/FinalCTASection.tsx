"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { finalCtaContent } from '@/content/final-cta';
import { ctaReveal, sectionRevealViewport } from '@/lib/motion';
import GetStartedButton from '../ui/GetStartedButton';

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

        <GetStartedButton href={finalCtaContent.cta.href} className="mt-4" />
      </motion.div>
    </section>
  );
}
