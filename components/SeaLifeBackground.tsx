'use client';

import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';

// Pixel Art SVGs - Brighter Colors
const Fish1 = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
    <path d="M4 4H8V6H4V4Z" fill="#F9A8D4"/> {/* Lighter Pink */}
    <path d="M8 2H12V4H8V2Z" fill="#F9A8D4"/>
    <path d="M12 4H16V6H12V4Z" fill="#F9A8D4"/>
    <path d="M16 6H20V10H16V6Z" fill="#F9A8D4"/>
    <path d="M12 10H16V12H12V10Z" fill="#F9A8D4"/>
    <path d="M8 12H12V14H8V12Z" fill="#F9A8D4"/>
    <path d="M4 10H8V12H4V10Z" fill="#F9A8D4"/>
    <rect x="14" y="5" width="2" height="2" fill="white"/>
  </svg>
);

const Fish2 = () => (
  <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
     <path d="M4 6H12V8H4V6Z" fill="#86EFAC"/> {/* Lighter Green */}
     <path d="M12 4H20V6H12V4Z" fill="#86EFAC"/>
     <path d="M20 6H24V8H20V6Z" fill="#86EFAC"/>
     <path d="M24 8H28V12H24V8Z" fill="#86EFAC"/>
     <path d="M20 12H24V14H20V12Z" fill="#86EFAC"/>
     <path d="M12 14H20V16H12V14Z" fill="#86EFAC"/>
     <path d="M4 12H12V14H4V12Z" fill="#86EFAC"/>
     <rect x="18" y="6" width="2" height="2" fill="white"/>
  </svg>
);

const Jellyfish = () => (
  <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
    <path d="M4 8H20V16H4V8Z" fill="#C7D2FE" fillOpacity="0.9"/> {/* Lighter Blue */}
    <path d="M6 4H18V8H6V4Z" fill="#C7D2FE" fillOpacity="0.9"/>
    <path d="M6 16H8V28H6V16Z" fill="#C7D2FE" fillOpacity="0.7"/>
    <path d="M10 16H12V24H10V16Z" fill="#C7D2FE" fillOpacity="0.7"/>
    <path d="M14 16H16V26H14V16Z" fill="#C7D2FE" fillOpacity="0.7"/>
    <path d="M18 16H20V30H18V16Z" fill="#C7D2FE" fillOpacity="0.7"/>
  </svg>
);

const Turtle = () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixelated">
        <path d="M10 8H30V18H10V8Z" fill="#6EE7B7"/> {/* Lighter Teal */}
        <path d="M6 10H10V16H6V10Z" fill="#6EE7B7"/>
        <path d="M30 10H34V14H30V10Z" fill="#6EE7B7"/>
        <path d="M8 16H14V20H8V16Z" fill="#6EE7B7"/>
        <path d="M26 16H32V20H26V16Z" fill="#6EE7B7"/>
        <path d="M34 11H38V13H34V11Z" fill="#6EE7B7"/>
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

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#02040a]">
      {/* Layer 0: Deep Background (Bubbles/Particles) - Increased opacity */}
      <div className="absolute inset-0 opacity-40">
         {[...Array(30)].map((_, i) => (
             <motion.div
                key={`bubble-${i}`}
                className="absolute bg-white/20 rounded-none" // Square bubbles for pixel look
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
        {[...Array(8)].map((_, i) => (
             <motion.div
                key={`fish1-${i}`}
                className="absolute"
                style={{
                    top: `${10 + i * 12}%`,
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

        {/* School of Fish 2 (Swimming Left) */}
        {[...Array(5)].map((_, i) => (
            <motion.div
                key={`fish2-${i}`}
                className="absolute"
                style={{
                    top: `${30 + i * 15}%`,
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
        ))}

        {/* Jellyfish */}
        {[...Array(5)].map((_, i) => (
            <motion.div
                key={`jelly-${i}`}
                className="absolute"
                style={{
                    left: `${10 + i * 20}%`,
                    top: -50
                }}
                animate={{
                    y: [-50, typeof window !== 'undefined' ? window.innerHeight + 50 : 1000],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    y: {
                        duration: 30 + i * 5,
                        repeat: Infinity,
                        ease: "linear" as const,
                        delay: i * 5,
                        repeatType: "loop" as const
                    },
                    scale: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut" as const,
                        delay: i,
                        repeatType: "loop" as const
                    }
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
            maskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0,0,0,0.8) 20%, black 100%)`,
            WebkitMaskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0,0,0,0.8) 20%, black 100%)`,
        }}
      />
    </div>
  );
}
