/**
 * TypeScript declarations for Widgetbot custom element
 */
declare namespace JSX {
  interface IntrinsicElements {
    widgetbot: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        server?: string;
        channel?: string;
        width?: string | number;
        height?: string | number;
      },
      HTMLElement
    >;
  }
}
