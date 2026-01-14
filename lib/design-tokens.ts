/**
 * Design Tokens - Katz Ventures Brand Standards + Technical Brutalism
 * 
 * This file contains all design tokens including colors, typography,
 * spacing, and animations for consistent design system usage.
 */

export const tokens = {
  colors: {
    primary: '#EDDF00', // Yellow
    secondary: '#536878', // Blue-gray
    accent: '#000100', // Black
    neutralLight: '#EAEAEA',
    white: '#FFFFFF',
    dark: '#000000',
  } as const,

  typography: {
    fontFamily: "'Space Grotesk', sans-serif",
    weights: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    sizes: {
      h1: {
        base: 'text-5xl', // 48px
        lg: 'lg:text-7xl', // 72px
        weight: 700, // Bold
        tracking: 'tracking-tight',
        lineHeight: 0.95,
      },
      h2: {
        base: 'text-4xl', // 36px
        lg: 'lg:text-5xl', // 48px
        weight: 700, // Bold
        lineHeight: 1.1,
      },
      h3: {
        base: 'text-2xl', // 24px
        lg: 'lg:text-3xl', // 30px
        weight: 700, // Bold
        lineHeight: 1.2,
      },
      body: {
        base: 'text-lg', // 16-18px
        weight: 400, // Regular
        lineHeight: 1.6,
      },
      label: {
        base: 'text-sm', // 14px
        weight: 500, // Medium
        lineHeight: 1.4,
      },
    },
  } as const,

  spacing: {
    borderRadius: 'rounded-none', // 0px - sharp, angular aesthetic
    borderWidth: 'border-2', // 2px - bold borders
    shadow: 'shadow-lg',
    hover: {
      lift: 'hover:-translate-y-1',
    },
    scale: {
      featured: 'scale-105',
    },
  } as const,

  animations: {
    durations: {
      fast: 400, // ms - scroll-triggered fade & slide
      medium: 600, // ms - clip path text reveal
      slow: 3000, // ms - beam border animation
    },
    easing: {
      easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // scroll-triggered fade & slide
      diagonal: 'cubic-bezier(0.77, 0, 0.175, 1)', // clip path text reveal
      linear: 'linear', // beam border animation
    },
    patterns: {
      scrollFade: {
        name: 'scroll-triggered-fade-slide',
        performance: 1,
        duration: 400, // ms
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        threshold: 0.5, // 50% visibility
        translateY: 50, // px - slide up distance
        css: {
          initial: {
            opacity: 0,
            transform: 'translateY(50px)',
            transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
          animated: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        intersectionObserver: {
          threshold: 0.5,
        },
      },
      clipReveal: {
        name: 'clip-path-text-reveal',
        performance: 1,
        duration: 600, // ms
        easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
        css: {
          initial: {
            clipPath: 'inset(0 100% 0 0)',
            animation: 'revealText 600ms cubic-bezier(0.77, 0, 0.175, 1) forwards',
          },
          keyframes: {
            revealText: {
              from: { clipPath: 'inset(0 100% 0 0)' },
              to: { clipPath: 'inset(0 0 0 0)' },
            },
          },
        },
      },
      beamBorder: {
        name: 'beam-border-animation',
        performance: 2,
        duration: 3000, // ms
        easing: 'linear',
        colors: {
          from: '#EDDF00', // Yellow
          to: '#536878', // Blue-gray
        },
        css: {
          property: {
            syntax: '<angle>',
            initialValue: '0deg',
            inherits: false,
          },
          initial: {
            angle: '0deg',
            border: '2px solid',
            borderImage: 'linear-gradient(var(--angle), #EDDF00, #536878) 1',
            animation: 'rotate 3000ms linear infinite',
          },
          keyframes: {
            rotate: {
              from: { angle: '0deg' },
              to: { angle: '360deg' },
            },
          },
        },
      },
    },
  } as const,
} as const;

// Type exports for TypeScript type safety
export type DesignTokens = typeof tokens;
export type Colors = typeof tokens.colors;
export type Typography = typeof tokens.typography;
export type Spacing = typeof tokens.spacing;
export type Animations = typeof tokens.animations;
