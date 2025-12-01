/**
 * Dalvik Runtime - HLE for Android Framework
 */

export class DalvikRuntime {
  // Mock Android Classes
  
  static Activity = class {
    onCreate(bundle: any) {
      console.log('Activity.onCreate', bundle);
    }
  };

  static View = class {
    draw() {
      console.log('View.draw');
    }
  };

  static Intent = class {
    constructor(action: string) {
      console.log('new Intent', action);
    }
  };

  // JNI Bridge
  
  callStaticMethod(className: string, methodName: string, args: any[]): any {
    console.log(`JNI: CallStatic ${className}.${methodName}`, args);
    return null;
  }
}

