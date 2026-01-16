'use client';

import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';

// Pixel Art SVGs
const Fish1 = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
    <path d="M4 4H8V6H4V4Z" fill="#F472B6"/>
    <path d="M8 2H12V4H8V2Z" fill="#F472B6"/>
    <path d="M12 4H16V6H12V4Z" fill="#F472B6"/>
    <path d="M16 6H20V10H16V6Z" fill="#F472B6"/>
    <path d="M12 10H16V12H12V10Z" fill="#F472B6"/>
    <path d="M8 12H12V14H8V12Z" fill="#F472B6"/>
    <path d="M4 10H8V12H4V10Z" fill="#F472B6"/>
    <rect x="14" y="5" width="2" height="2" fill="white"/>
  </svg>
);

const Fish2 = () => (
  <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
     <path d="M4 6H12V8H4V6Z" fill="#4ADE80"/>
     <path d="M12 4H20V6H12V4Z" fill="#4ADE80"/>
     <path d="M20 6H24V8H20V6Z" fill="#4ADE80"/>
     <path d="M24 8H28V12H24V8Z" fill="#4ADE80"/>
     <path d="M20 12H24V14H20V12Z" fill="#4ADE80"/>
     <path d="M12 14H20V16H12V14Z" fill="#4ADE80"/>
     <path d="M4 12H12V14H4V12Z" fill="#4ADE80"/>
     <rect x="18" y="6" width="2" height="2" fill="white"/>
  </svg>
);

const Jellyfish = () => (
  <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
    <path d="M4 8H20V16H4V8Z" fill="#A8B4D0" fillOpacity="0.8"/>
    <path d="M6 4H18V8H6V4Z" fill="#A8B4D0" fillOpacity="0.8"/>
    <path d="M6 16H8V28H6V16Z" fill="#A8B4D0" fillOpacity="0.6"/>
    <path d="M10 16H12V24H10V16Z" fill="#A8B4D0" fillOpacity="0.6"/>
    <path d="M14 16H16V26H14V16Z" fill="#A8B4D0" fillOpacity="0.6"/>
    <path d="M18 16H20V30H18V16Z" fill="#A8B4D0" fillOpacity="0.6"/>
  </svg>
);

const Turtle = () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
        <path d="M10 8H30V18H10V8Z" fill="#5F8C6D"/>
        <path d="M6 10H10V16H6V10Z" fill="#5F8C6D"/>
        <path d="M30 10H34V14H30V10Z" fill="#5F8C6D"/>
        <path d="M8 16H14V20H8V16Z" fill="#5F8C6D"/>
        <path d="M26 16H32V20H26V16Z" fill="#5F8C6D"/>
        <path d="M34 11H38V13H34V11Z" fill="#5F8C6D"/>
        <rect x="35" y="11" width="1" height="1" fill="black"/>
    </svg>
)

export function SeaLifeBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const fishVariants: Variants = {
    swimRight: {
      x: [ -100, typeof window !== 'undefined' ? window.innerWidth + 100 : 2000 ],
      transition: {
        duration: 20,
        repeat: Infinity,
        ease: "linear" as const,
        delay: 0,
      }
    },
    swimLeft: {
        x: [ typeof window !== 'undefined' ? window.innerWidth + 100 : 2000, -100 ],
        transition: {
          duration: 25,
          repeat: Infinity,
          ease: "linear" as const,
          delay: 0,
        }
    },
    bob: {
        y: [0, -20, 0],
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut" as const
        }
    }
  };

  const jellyfishVariants: Variants = {
    float: {
        y: [-50, typeof window !== 'undefined' ? window.innerHeight + 50 : 1000],
        transition: {
            duration: 40,
            repeat: Infinity,
            ease: "linear" as const
        }
    },
    pulse: {
        scale: [1, 1.1, 1],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut" as const
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050810]">
      {/* Layer 0: Deep Background (Bubbles/Particles) */}
      <div className="absolute inset-0 opacity-20">
         {[...Array(20)].map((_, i) => (
             <motion.div
                key={`bubble-${i}`}
                className="absolute bg-white/10 rounded-full"
                style={{
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                }}
                animate={{
                    y: [0, -1000],
                    opacity: [0, 1, 0]
                }}
                transition={{
                    duration: Math.random() * 20 + 10,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 10
                }}
             />
         ))}
      </div>

      {/* Layer 1: Active Sea Life */}
      <div className="absolute inset-0">
        {/* School of Fish 1 */}
        {[...Array(5)].map((_, i) => (
             <motion.div
                key={`fish1-${i}`}
                className="absolute"
                style={{
                    top: `${20 + i * 10}%`,
                    left: -100,
                }}
                animate="swimRight"
                variants={fishVariants}
                custom={i}
             >
                 <motion.div animate="bob" variants={fishVariants}>
                    <Fish1 />
                 </motion.div>
             </motion.div>
        ))}

        {/* Solo Fish 2 */}
        <motion.div
            className="absolute"
            style={{
                top: '60%',
                left: '100%'
            }}
            animate="swimLeft"
            variants={fishVariants}
        >
            <motion.div animate="bob" variants={fishVariants}>
                <div style={{ transform: 'scaleX(-1)' }}>
                    <Fish2 />
                </div>
            </motion.div>
        </motion.div>

        {/* Jellyfish */}
        {[...Array(3)].map((_, i) => (
            <motion.div
                key={`jelly-${i}`}
                className="absolute"
                style={{
                    left: `${15 + i * 30}%`,
                    top: -50
                }}
                animate={["float", "pulse"]}
                variants={jellyfishVariants}
                transition={{
                    float: { duration: 30 + i * 5, repeat: Infinity, ease: "linear", delay: i * 5 },
                    pulse: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i }
                }}
            >
                <Jellyfish />
            </motion.div>
        ))}
        
        {/* Turtle */}
         <motion.div
            className="absolute"
            style={{
                top: '40%',
                left: -200,
            }}
            animate={{
                x: [ -200, typeof window !== 'undefined' ? window.innerWidth + 200 : 2000 ],
                y: [0, 50, 0, -50, 0]
            }}
            transition={{
                x: { duration: 60, repeat: Infinity, ease: "linear" },
                y: { duration: 10, repeat: Infinity, ease: "easeInOut" }
            }}
        >
            <Turtle />
        </motion.div>

      </div>

      {/* Layer 2: Dark Overlay with Flashlight Mask */}
      <div 
        className="absolute inset-0 bg-[#0B0F1A] transition-colors duration-300"
        style={{
            maskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, transparent 10%, black 100%)`,
            WebkitMaskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, transparent 10%, black 100%)`,
             // Invert mask logic: The mask image defines what is VISIBLE.
             // We want the overlay to be visible everywhere EXCEPT the circle.
             // So, mask should be opaque everywhere, transparent at circle.
             // radial-gradient(circle at center, transparent, black)
             // transparent parts will be HIDDEN (showing the sea life underneath)
             // black parts will be VISIBLE (showing the dark overlay)
        }}
      />
    </div>
  );
}
