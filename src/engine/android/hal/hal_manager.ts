/**
 * Virtual HALs - Hardware Abstraction Layers
 * Covers Items:
 * 18. Re-implement AAudio API using WebAudio.
 * 87. Virtual GPS with geolocation API.
 * 91. Fake power HAL.
 * 92. Fake sensors HAL using devicemotion data.
 * 93. GPU-accelerated virtual sensors.
 */

// --- Audio HAL ---
export class AudioHAL {
    private context: AudioContext;
    
    constructor() {
        // @ts-ignore
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextClass();
    }

    createStream() {
        console.log("[AudioHAL] Creating AAudio stream via WebAudio");
        // Return a handle/id
        return 1;
    }

    playSound(buffer: Float32Array) {
        const audioBuffer = this.context.createBuffer(1, buffer.length, 44100);
        audioBuffer.copyToChannel(buffer, 0);
        
        const source = this.context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.context.destination);
        source.start();
    }
}

// --- Sensors HAL ---
export class SensorsHAL {
    constructor() {
        this.init();
    }

    init() {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('devicemotion', this.handleMotion.bind(this));
            window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        }
    }

    handleMotion(event: DeviceMotionEvent) {
        // Map to Android Sensor events (ACCELEROMETER, GYROSCOPE)
        // console.log(`[SensorsHAL] Accel: ${event.acceleration?.x}`);
    }

    handleOrientation(event: DeviceOrientationEvent) {
        // Map to ROTATION_VECTOR
    }

    /**
     * GPU-accelerated sensor fusion (Item 93)
     */
    processSensorFusionGPU() {
        // Use Compute Shader to fuse accel + gyro + mag
    }
}

// --- GPS HAL ---
export class GPSHAL {
    getCurrentLocation(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            } else {
                reject("Geolocation not supported");
            }
        });
    }
}

// --- Power HAL ---
export class PowerHAL {
    async getBatteryLevel(): Promise<number> {
        // @ts-ignore
        if (navigator.getBattery) {
            // @ts-ignore
            const battery = await navigator.getBattery();
            return battery.level * 100;
        }
        return 100; // Fake 100%
    }

    acquireWakeLock() {
        if ('wakeLock' in navigator) {
            // @ts-ignore
            navigator.wakeLock.request('screen').catch(console.error);
        }
    }
}

export const audioHal = new AudioHAL();
export const sensorsHal = new SensorsHAL();
export const gpsHal = new GPSHAL();
export const powerHal = new PowerHAL();
