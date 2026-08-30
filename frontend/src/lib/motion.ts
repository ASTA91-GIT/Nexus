import type { Variants, Transition } from "framer-motion";

export const cinematicEase: Transition["ease"] = [0.16, 1, 0.3, 1];

export const staggerContainer = (stagger = 0.12, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

export const navEntrance: Variants = {
  hidden: { y: -24, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: cinematicEase },
  },
};

export const navGlassVariants: Variants = {
  top: {
    backgroundColor: "rgba(5, 11, 22, 0)",
    borderColor: "rgba(59, 130, 246, 0)",
    boxShadow: "0 0 0 rgba(0,0,0,0)",
    backdropFilter: "blur(0px)",
    transition: { duration: 0.5, ease: cinematicEase },
  },
  scrolled: {
    backgroundColor: "rgba(5, 11, 22, 0.65)",
    borderColor: "rgba(59, 130, 246, 0.15)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    backdropFilter: "blur(16px)",
    transition: { duration: 0.5, ease: cinematicEase },
  },
};

export const statusPill: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: cinematicEase } },
};

export const headlineEntrance: Variants = {
  hidden: { opacity: 0, x: -60, clipPath: "inset(0 100% 0 0)" },
  show: {
    opacity: 1,
    x: 0,
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 1.1, ease: cinematicEase },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: cinematicEase } },
};

export const buttonStagger = staggerContainer(0.15, 0.9);
export const buttonItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: cinematicEase },
  },
};

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: cinematicEase },
  },
};

export const sectionRevealViewport = { once: true, margin: "-100px" };

export const cardGridContainer = staggerContainer(0.1);
export const cardItem: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: cinematicEase },
  },
};

export const cardHover = {
  y: -6,
  boxShadow: "0 0 40px rgba(34,211,238,0.2)",
  transition: { duration: 0.4, ease: cinematicEase },
};

export const workflowNode: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: cinematicEase } },
};
export const workflowStagger = staggerContainer(0.18);

export const workflowPathDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0.3 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.8, ease: cinematicEase },
  },
};

export const ctaReveal: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, ease: cinematicEase },
  },
};
