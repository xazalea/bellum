/**
 * Task Executor
 * Executes tasks in Google Translate iframe and extracts results
 */

import type {
  ComputeTask,
  TaskExecutionContext,
  ResultExtractionConfig,
} from './types';

export class TaskExecutor {
  private iframes: Map<string, HTMLIFrameElement> = new Map();

  /**
   * Execute task in iframe
   */
  async executeInIframe(
    context: TaskExecutionContext,
    translateUrl: string
  ): Promise<unknown> {
    const { task } = context;

    // Create iframe
    const iframe = this._createIframe(task.id);
    context.iframeElement = iframe;
    this.iframes.set(task.id, iframe);

    try {
      // Load URL in iframe
      await this._loadIframe(iframe, translateUrl);

      // Extract result based on extraction config
      const extractionConfig =
        task.payload.type !== 'generic' ? task.payload.extractionConfig : null;

      if (!extractionConfig) {
        throw new Error('No extraction config provided');
      }

      const result = await this._extractResult(iframe, extractionConfig, task.id);

      return result;
    } finally {
      // Cleanup
      this._cleanupIframe(task.id);
    }
  }

  /**
   * Create iframe element
   */
  private _createIframe(taskId: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = `google-compute-${taskId}`;
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.visibility = 'hidden';
    iframe.sandbox.add('allow-scripts', 'allow-same-origin');

    document.body.appendChild(iframe);

    return iframe;
  }

  /**
   * Load URL in iframe
   */
  private async _loadIframe(
    iframe: HTMLIFrameElement,
    url: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 30000);

      iframe.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Iframe load error'));
      };

      iframe.src = url;
    });
  }

  /**
   * Extract result from iframe
   */
  private async _extractResult(
    iframe: HTMLIFrameElement,
    config: ResultExtractionConfig,
    taskId: string
  ): Promise<unknown> {
    const timeout = config.timeout || 5000;

    switch (config.method) {
      case 'dom':
        return this._extractFromDOM(iframe, config, timeout);
      case 'console':
        return this._extractFromConsole(iframe, timeout);
      case 'postMessage':
        return this._extractFromPostMessage(taskId, timeout);
      case 'http':
        return this._extractFromHTTP(config, timeout);
      default:
        throw new Error(`Unknown extraction method: ${config.method}`);
    }
  }

  /**
   * Extract result from DOM
   */
  private async _extractFromDOM(
    iframe: HTMLIFrameElement,
    config: ResultExtractionConfig,
    timeout: number
  ): Promise<unknown> {
    if (!config.selector) {
      throw new Error('Selector required for DOM extraction');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('DOM extraction timeout'));
      }, timeout);

      try {
        // Try to access iframe content
        const doc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!doc) {
          clearTimeout(timeoutId);
          reject(new Error('Cannot access iframe document'));
          return;
        }

        // Wait for element to appear
        const checkElement = () => {
          const element = doc.querySelector(config.selector!);
          if (element) {
            clearTimeout(timeoutId);
            resolve({
              text: element.textContent,
              html: element.innerHTML,
              attributes: Array.from(element.attributes).reduce(
                (acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                },
                {} as Record<string, string>
              ),
            });
          } else {
            setTimeout(checkElement, 100);
          }
        };

        checkElement();
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Extract result from console
   */
  private async _extractFromConsole(
    iframe: HTMLIFrameElement,
    timeout: number
  ): Promise<unknown> {
    const consoleLogs: unknown[] = [];

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        resolve(consoleLogs);
      }, timeout);

      try {
        // Intercept console.log
        const win = iframe.contentWindow;
        if (!win) {
          clearTimeout(timeoutId);
          reject(new Error('Cannot access iframe window'));
          return;
        }

        const originalLog = win.console.log;
        win.console.log = (...args: unknown[]) => {
          consoleLogs.push(args);
          originalLog.apply(win.console, args);

          // Check if we got a result marker
          if (args[0] === '__RESULT__') {
            clearTimeout(timeoutId);
            resolve(args[1]);
          }
        };
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Extract result from postMessage
   */
  private async _extractFromPostMessage(
    taskId: string,
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('postMessage timeout'));
      }, timeout);

      const handler = (event: MessageEvent) => {
        if (event.data && event.data.taskId === taskId) {
          clearTimeout(timeoutId);
          window.removeEventListener('message', handler);
          resolve(event.data.result);
        }
      };

      window.addEventListener('message', handler);
    });
  }

  /**
   * Extract result from HTTP callback
   */
  private async _extractFromHTTP(
    config: ResultExtractionConfig,
    timeout: number
  ): Promise<unknown> {
    if (!config.callbackUrl) {
      throw new Error('Callback URL required for HTTP extraction');
    }

    // Poll the callback URL
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('HTTP callback timeout'));
      }, timeout);

      const poll = async () => {
        try {
          const response = await fetch(config.callbackUrl!);
          if (response.ok) {
            const data = await response.json();
            clearTimeout(timeoutId);
            resolve(data);
          } else {
            setTimeout(poll, 500);
          }
        } catch (error) {
          setTimeout(poll, 500);
        }
      };

      poll();
    });
  }

  /**
   * Cleanup iframe
   */
  private _cleanupIframe(taskId: string): void {
    const iframe = this.iframes.get(taskId);
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    this.iframes.delete(taskId);
  }

  /**
   * Cleanup all iframes
   */
  cleanupAll(): void {
    for (const taskId of this.iframes.keys()) {
      this._cleanupIframe(taskId);
    }
  }
}

// Singleton instance
let instance: TaskExecutor | null = null;

export function getTaskExecutor(): TaskExecutor {
  if (!instance) {
    instance = new TaskExecutor();
  }
  return instance;
}
