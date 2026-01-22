declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'rotation-per-second'?: string;
        'interaction-prompt'?: 'auto' | 'none';
        'touch-action'?: string;
        'shadow-intensity'?: string;
        'shadow-softness'?: string;
        'camera-orbit'?: string;
        'environment-image'?: string;
        'tone-mapping'?: string;
        'interpolation-decay'?: string;
        'animation-name'?: string;
        'animation-crossfade-duration'?: string;
        'playback-rate'?: string;
        ar?: boolean;
        autoplay?: boolean;
        'disable-zoom'?: boolean;
        exposure?: string;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'interaction' | 'manual';
      }, HTMLElement>;
    }
  }
}
export {};
