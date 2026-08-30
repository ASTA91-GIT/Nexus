"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { workflowContent } from '@/content/workflow';
import { 
  sectionReveal, 
  sectionRevealViewport, 
  workflowStagger, 
  workflowNode, 
  workflowPathDraw 
} from '@/lib/motion';

export default function WorkflowSection() {
  return (
    <section id="workflow" className="py-section bg-nexus-bg-base relative z-20 border-t border-nexus-glass-border overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade opacity-40 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-24"
          initial="hidden"
          whileInView="show"
          viewport={sectionRevealViewport}
          variants={sectionReveal}
        >
          <div className="text-nexus-accent-primary font-mono text-eyebrow mb-4 tracking-[0.28em]">
            {workflowContent.eyebrow}
          </div>
          <h2 className="text-display-md md:text-display-lg font-display font-black text-nexus-text-primary tracking-tight mb-6">
            {workflowContent.heading}
          </h2>
        </motion.div>

        <motion.div 
          className="space-y-12 relative"
          initial="hidden"
          whileInView="show"
          viewport={sectionRevealViewport}
          variants={workflowStagger}
        >
          {workflowContent.steps.map((step, index) => (
            <motion.div key={index} variants={workflowNode} className="relative flex flex-col md:flex-row items-center gap-8 group">
              {/* Connector Line (Desktop) */}
              {index !== workflowContent.steps.length - 1 && (
                <div className="hidden md:block absolute top-24 left-1/2 -translate-x-1/2 w-[1px] h-12 z-0">
                  <motion.div 
                    className="w-full bg-nexus-accent-primary transform origin-top"
                    variants={workflowPathDraw}
                  />
                </div>
              )}

              <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                <div className="text-[120px] font-display font-black text-nexus-glass-surface group-hover:text-nexus-glass-surfaceHover transition-colors duration-500 leading-none select-none">
                  {step.index}
                </div>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-nexus-bg-base border-2 border-nexus-accent-primary z-10 group-hover:scale-150 group-hover:bg-nexus-accent-primary group-hover:shadow-glow-blue transition-all duration-300"></div>

              <div className="w-full md:w-1/2 text-center md:text-left pt-4 md:pt-0 pb-12 md:pb-0 px-4 md:px-0 z-10 bg-nexus-bg-base md:bg-transparent">
                <h3 className="text-xl font-display font-bold text-nexus-text-primary mb-2 tracking-wide flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-nexus-accent-secondary text-sm font-mono block md:hidden">{step.index}</span>
                  {step.title}
                </h3>
                <p className="text-nexus-text-secondary font-body font-light text-sm max-w-xs mx-auto md:mx-0">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
