declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        'camera-controls'?: boolean;
        'touch-action'?: string;
        'shadow-intensity'?: string;
        'camera-orbit'?: string;
        'environment-image'?: string;
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
