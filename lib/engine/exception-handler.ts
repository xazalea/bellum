/**
 * Exception and Error Handling System
 * Catches and handles runtime exceptions gracefully
 */

export enum ExceptionType {
    MEMORY_ACCESS_VIOLATION,
    INVALID_INSTRUCTION,
    DIVISION_BY_ZERO,
    STACK_OVERFLOW,
    HEAP_CORRUPTION,
    SYSCALL_ERROR,
    PROCESS_EXIT,
    SEGMENTATION_FAULT,
    ILLEGAL_OPERATION,
    TIMEOUT,
}

export interface ExceptionInfo {
    type: ExceptionType;
    message: string;
    address?: number;
    instruction?: number;
    stackTrace?: string[];
    timestamp: number;
    recoverable: boolean;
}

export class ExecutionException extends Error {
    constructor(
        public info: ExceptionInfo
    ) {
        super(info.message);
        this.name = 'ExecutionException';
    }
}

export class ExceptionHandler {
    private handlers: Map<ExceptionType, ExceptionCallback[]> = new Map();
    private globalHandler: ExceptionCallback | null = null;
    private exceptionHistory: ExceptionInfo[] = [];
    private maxHistorySize: number = 100;
    
    /**
     * Register exception handler for specific type
     */
    registerHandler(type: ExceptionType, callback: ExceptionCallback): void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        
        this.handlers.get(type)!.push(callback);
    }
    
    /**
     * Register global exception handler (catches all)
     */
    registerGlobalHandler(callback: ExceptionCallback): void {
        this.globalHandler = callback;
    }
    
    /**
     * Handle exception
     */
    handle(info: ExceptionInfo): ExceptionResolution {
        // Add to history
        this.exceptionHistory.push(info);
        if (this.exceptionHistory.length > this.maxHistorySize) {
            this.exceptionHistory.shift();
        }
        
        console.error(`[Exception] ${ExceptionType[info.type]}: ${info.message}`);
        if (info.address !== undefined) {
            console.error(`  Address: 0x${info.address.toString(16)}`);
        }
        if (info.stackTrace) {
            console.error('  Stack trace:', info.stackTrace.join('\n    '));
        }
        
        // Try specific handlers
        const handlers = this.handlers.get(info.type);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    const resolution = handler(info);
                    if (resolution.handled) {
                        return resolution;
                    }
                } catch (error) {
                    console.error('[Exception] Handler itself threw:', error);
                }
            }
        }
        
        // Try global handler
        if (this.globalHandler) {
            try {
                const resolution = this.globalHandler(info);
                if (resolution.handled) {
                    return resolution;
                }
            } catch (error) {
                console.error('[Exception] Global handler threw:', error);
            }
        }
        
        // Default: terminate if not recoverable
        return {
            handled: false,
            action: info.recoverable ? ExceptionAction.CONTINUE : ExceptionAction.TERMINATE,
            message: 'Unhandled exception',
        };
    }
    
    /**
     * Create exception from error
     */
    createException(
        type: ExceptionType,
        message: string,
        address?: number,
        recoverable: boolean = false
    ): ExecutionException {
        const info: ExceptionInfo = {
            type,
            message,
            address,
            timestamp: Date.now(),
            recoverable,
            stackTrace: this.captureStackTrace(),
        };
        
        return new ExecutionException(info);
    }
    
    /**
     * Wrap function with exception handling
     */
    wrap<T>(fn: () => T, context?: string): T {
        try {
            return fn();
        } catch (error) {
            if (error instanceof ExecutionException) {
                this.handle(error.info);
                throw error;
            } else {
                const info: ExceptionInfo = {
                    type: ExceptionType.ILLEGAL_OPERATION,
                    message: `${context || 'Operation'} failed: ${error}`,
                    timestamp: Date.now(),
                    recoverable: false,
                    stackTrace: this.captureStackTrace(),
                };
                
                this.handle(info);
                throw new ExecutionException(info);
            }
        }
    }
    
    /**
     * Wrap async function with exception handling
     */
    async wrapAsync<T>(fn: () => Promise<T>, context?: string): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (error instanceof ExecutionException) {
                this.handle(error.info);
                throw error;
            } else {
                const info: ExceptionInfo = {
                    type: ExceptionType.ILLEGAL_OPERATION,
                    message: `${context || 'Async operation'} failed: ${error}`,
                    timestamp: Date.now(),
                    recoverable: false,
                    stackTrace: this.captureStackTrace(),
                };
                
                this.handle(info);
                throw new ExecutionException(info);
            }
        }
    }
    
    /**
     * Get exception history
     */
    getHistory(): ExceptionInfo[] {
        return [...this.exceptionHistory];
    }
    
    /**
     * Clear exception history
     */
    clearHistory(): void {
        this.exceptionHistory = [];
    }
    
    /**
     * Get statistics
     */
    getStatistics(): {
        totalExceptions: number;
        byType: Map<ExceptionType, number>;
        recoverableCount: number;
        fatalCount: number;
    } {
        const byType = new Map<ExceptionType, number>();
        let recoverableCount = 0;
        let fatalCount = 0;
        
        for (const info of this.exceptionHistory) {
            byType.set(info.type, (byType.get(info.type) || 0) + 1);
            
            if (info.recoverable) {
                recoverableCount++;
            } else {
                fatalCount++;
            }
        }
        
        return {
            totalExceptions: this.exceptionHistory.length,
            byType,
            recoverableCount,
            fatalCount,
        };
    }
    
    /**
     * Internal: Capture stack trace
     */
    private captureStackTrace(): string[] {
        const trace: string[] = [];
        
        try {
            const stack = new Error().stack;
            if (stack) {
                const lines = stack.split('\n').slice(2); // Skip Error and captureStackTrace
                trace.push(...lines);
            }
        } catch (error) {
            // Ignore
        }
        
        return trace;
    }
}

export enum ExceptionAction {
    CONTINUE,
    RETRY,
    TERMINATE,
    SKIP_INSTRUCTION,
}

export interface ExceptionResolution {
    handled: boolean;
    action: ExceptionAction;
    message?: string;
    newAddress?: number;
}

export type ExceptionCallback = (info: ExceptionInfo) => ExceptionResolution;

// Export singleton
export const exceptionHandler = new ExceptionHandler();

// Register default handlers
exceptionHandler.registerHandler(ExceptionType.DIVISION_BY_ZERO, (info) => {
    console.warn('[Exception] Division by zero, returning 0');
    return {
        handled: true,
        action: ExceptionAction.CONTINUE,
        message: 'Division by zero handled',
    };
});

exceptionHandler.registerHandler(ExceptionType.PROCESS_EXIT, (info) => {
    console.log('[Exception] Process exit requested');
    return {
        handled: true,
        action: ExceptionAction.TERMINATE,
        message: 'Process exited normally',
    };
});
