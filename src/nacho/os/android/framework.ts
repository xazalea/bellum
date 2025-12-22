/**
 * Android Framework Shim for Nacho
 * Maps core Android UI/Activity classes to the Web DOM/Canvas.
 */

export namespace Android {

    // android.content.Context
    export class Context {
        // Placeholder
    }

    // android.view.View
    export class View {
        public element: HTMLElement;
        protected context: Context;

        constructor(context: Context) {
            this.context = context;
            this.element = document.createElement('div');
            this.element.style.position = 'absolute';
            // Default Android-like styling
            this.element.style.display = 'flex';
            this.element.style.flexDirection = 'column';
            this.element.dataset.androidClass = this.constructor.name;
        }

        public setLayoutParams(width: number, height: number) {
            this.element.style.width = width === -1 ? '100%' : `${width}px`;
            this.element.style.height = height === -1 ? '100%' : `${height}px`;
        }

        public setBackgroundColor(color: number) {
            // Convert int color to hex string (mocking)
            const hex = '#' + (color & 0x00FFFFFF).toString(16).padStart(6, '0');
            this.element.style.backgroundColor = hex;
        }

        public setOnClickListener(listener: () => void) {
            this.element.onclick = listener;
        }
    }

    // android.widget.TextView
    export namespace Widget {
        export class TextView extends View {
            constructor(context: Context) {
                super(context);
                this.element = document.createElement('span');
                this.element.style.fontFamily = 'Roboto, sans-serif';
                this.element.style.fontSize = '16px';
            }

            public setText(text: string) {
                this.element.innerText = text;
            }

            public setTextColor(color: number) {
                const hex = '#' + (color & 0x00FFFFFF).toString(16).padStart(6, '0');
                this.element.style.color = hex;
            }
        }

        export class Button extends TextView {
            constructor(context: Context) {
                super(context);
                this.element = document.createElement('button');
                // Material Design-ish defaults
                this.element.style.padding = '10px 20px';
                this.element.style.border = 'none';
                this.element.style.borderRadius = '4px';
                this.element.style.cursor = 'pointer';
                this.element.style.textTransform = 'uppercase';
                this.element.style.boxShadow = '0 2px 2px 0 rgba(0,0,0,0.14)';
            }
        }

        export class LinearLayout extends View {
            constructor(context: Context) {
                super(context);
                this.element.style.display = 'flex';
            }

            public setOrientation(orientation: 'horizontal' | 'vertical') {
                this.element.style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
            }

            public addView(view: View) {
                this.element.appendChild(view.element);
            }
        }
    }

    // android.app.Activity
    export namespace App {
        export class Activity extends Context {
            public window: HTMLElement;
            private rootLayout: View | null = null;

            constructor() {
                super();
                // Create a "Phone Screen" container
                this.window = document.createElement('div');
                this.window.id = 'android-window';
                this.window.style.width = '100%';
                this.window.style.height = '100%';
                this.window.style.backgroundColor = '#ffffff';
                this.window.style.overflow = 'hidden';
                this.window.style.position = 'relative';
            }

            public onCreate(savedInstanceState: any) {
                console.log("Activity.onCreate called.");
            }

            public setContentView(layoutResId: number) {
                // In real impl, we'd inflate XML.
                // For shim, we assume the code constructs views programmatically or we handle 
                // the mock ID if possible.
                console.log(`Activity.setContentView(${layoutResId})`);
            }

            // Extension for Nacho: Allow setting a View instance directly (not standard Android, but helpful for shim)
            public setContentViewInstance(view: View) {
                this.rootLayout = view;
                this.window.innerHTML = '';
                this.window.appendChild(view.element);
            }

            public getWindowElement(): HTMLElement {
                return this.window;
            }
        }
    }
}
