/**
 * Android Package Manager
 * Manages app installation, permissions, and package info
 */

export interface PackageInfo {
  packageName: string;
  versionCode: number;
  versionName: string;
  applicationInfo: ApplicationInfo;
  activities: ActivityInfo[];
  services: ServiceInfo[];
  receivers: ReceiverInfo[];
  providers: ProviderInfo[];
  permissions: PermissionInfo[];
  requestedPermissions: string[];
  signatures: string[];
  firstInstallTime: number;
  lastUpdateTime: number;
}

export interface ApplicationInfo {
  packageName: string;
  name: string;
  className: string;
  icon: string;
  theme: string;
  sourceDir: string;
  dataDir: string;
  nativeLibraryDir: string;
  flags: number;
  enabled: boolean;
  targetSdkVersion: number;
  minSdkVersion: number;
}

export interface ActivityInfo {
  name: string;
  packageName: string;
  label: string;
  icon: string;
  launchMode: number;
  screenOrientation: number;
  configChanges: number;
}

export interface ServiceInfo {
  name: string;
  packageName: string;
  exported: boolean;
  enabled: boolean;
}

export interface ReceiverInfo {
  name: string;
  packageName: string;
  exported: boolean;
  enabled: boolean;
  priority: number;
}

export interface ProviderInfo {
  name: string;
  authority: string;
  readPermission: string;
  writePermission: string;
  exported: boolean;
}

export interface PermissionInfo {
  name: string;
  group: string;
  protectionLevel: PermissionProtectionLevel;
  description: string;
}

export enum PermissionProtectionLevel {
  NORMAL = 0,
  DANGEROUS = 1,
  SIGNATURE = 2,
  SIGNATURE_OR_SYSTEM = 3,
}

export interface ResolveInfo {
  activityInfo?: ActivityInfo;
  serviceInfo?: ServiceInfo;
  providerInfo?: ProviderInfo;
  priority: number;
}

/**
 * Package Manager Service
 */
export class PackageManager {
  private packages: Map<string, PackageInfo> = new Map();
  private grantedPermissions: Map<string, Set<string>> = new Map();
  
  // Well-known Android permissions
  private systemPermissions = new Set([
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.READ_CONTACTS',
    'android.permission.WRITE_CONTACTS',
    'android.permission.READ_PHONE_STATE',
    'android.permission.CALL_PHONE',
    'android.permission.SEND_SMS',
    'android.permission.RECEIVE_SMS',
    'android.permission.VIBRATE',
    'android.permission.WAKE_LOCK',
    'android.permission.BLUETOOTH',
    'android.permission.BLUETOOTH_ADMIN',
  ]);
  
  constructor() {
    console.log('[PackageManager] Initialized');
    this.installSystemPackages();
  }
  
  /**
   * Install system packages
   */
  private installSystemPackages(): void {
    // Install android framework package
    const androidPackage: PackageInfo = {
      packageName: 'android',
      versionCode: 30,
      versionName: '11.0',
      applicationInfo: {
        packageName: 'android',
        name: 'Android System',
        className: 'android.app.Application',
        icon: '',
        theme: '',
        sourceDir: '/system/framework/framework-res.apk',
        dataDir: '/data/system',
        nativeLibraryDir: '/system/lib',
        flags: 0x1,
        enabled: true,
        targetSdkVersion: 30,
        minSdkVersion: 1,
      },
      activities: [],
      services: [],
      receivers: [],
      providers: [],
      permissions: [],
      requestedPermissions: [],
      signatures: [],
      firstInstallTime: Date.now(),
      lastUpdateTime: Date.now(),
    };
    
    this.packages.set('android', androidPackage);
  }
  
  /**
   * Install package from APK
   */
  async installPackage(apkData: Uint8Array): Promise<PackageInfo> {
    console.log('[PackageManager] Installing package...');
    
    // Parse APK manifest (simplified)
    const packageInfo = await this.parseAPK(apkData);
    
    // Check if already installed
    if (this.packages.has(packageInfo.packageName)) {
      console.log(`[PackageManager] Updating package: ${packageInfo.packageName}`);
      const existing = this.packages.get(packageInfo.packageName)!;
      packageInfo.firstInstallTime = existing.firstInstallTime;
    }
    
    packageInfo.lastUpdateTime = Date.now();
    this.packages.set(packageInfo.packageName, packageInfo);
    
    // Auto-grant normal permissions
    this.grantNormalPermissions(packageInfo.packageName, packageInfo.requestedPermissions);
    
    console.log(`[PackageManager] Installed: ${packageInfo.packageName} v${packageInfo.versionName}`);
    return packageInfo;
  }
  
  /**
   * Uninstall package
   */
  uninstallPackage(packageName: string): boolean {
    if (!this.packages.has(packageName)) {
      return false;
    }
    
    console.log(`[PackageManager] Uninstalling: ${packageName}`);
    this.packages.delete(packageName);
    this.grantedPermissions.delete(packageName);
    
    return true;
  }
  
  /**
   * Get package info
   */
  getPackageInfo(packageName: string): PackageInfo | null {
    return this.packages.get(packageName) || null;
  }
  
  /**
   * Get all installed packages
   */
  getInstalledPackages(): PackageInfo[] {
    return Array.from(this.packages.values());
  }
  
  /**
   * Check if package is installed
   */
  isPackageInstalled(packageName: string): boolean {
    return this.packages.has(packageName);
  }
  
  /**
   * Resolve activity for intent
   */
  resolveActivity(intent: {
    action?: string;
    category?: string[];
    component?: { packageName: string; className: string };
  }): ResolveInfo | null {
    // If component specified, find exact match
    if (intent.component) {
      const pkg = this.packages.get(intent.component.packageName);
      if (!pkg) return null;
      
      const activity = pkg.activities.find(a => a.name === intent.component!.className);
      if (!activity) return null;
      
      return {
        activityInfo: activity,
        priority: 0,
      };
    }
    
    // Otherwise, search by action
    for (const pkg of this.packages.values()) {
      for (const activity of pkg.activities) {
        // Simplified matching - would check intent filters in real implementation
        return {
          activityInfo: activity,
          priority: 0,
        };
      }
    }
    
    return null;
  }
  
  /**
   * Check permission
   */
  checkPermission(packageName: string, permission: string): boolean {
    const granted = this.grantedPermissions.get(packageName);
    return granted?.has(permission) || false;
  }
  
  /**
   * Grant permission
   */
  grantPermission(packageName: string, permission: string): void {
    if (!this.grantedPermissions.has(packageName)) {
      this.grantedPermissions.set(packageName, new Set());
    }
    
    this.grantedPermissions.get(packageName)!.add(permission);
    console.log(`[PackageManager] Granted ${permission} to ${packageName}`);
  }
  
  /**
   * Revoke permission
   */
  revokePermission(packageName: string, permission: string): void {
    const granted = this.grantedPermissions.get(packageName);
    if (granted) {
      granted.delete(permission);
    }
  }
  
  /**
   * Get granted permissions for package
   */
  getGrantedPermissions(packageName: string): string[] {
    return Array.from(this.grantedPermissions.get(packageName) || []);
  }
  
  /**
   * Auto-grant normal permissions
   */
  private grantNormalPermissions(packageName: string, permissions: string[]): void {
    const normalPermissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
    ];
    
    for (const permission of permissions) {
      if (normalPermissions.includes(permission)) {
        this.grantPermission(packageName, permission);
      }
    }
  }
  
  /**
   * Parse APK (simplified)
   */
  private async parseAPK(apkData: Uint8Array): Promise<PackageInfo> {
    // In real implementation, would parse AndroidManifest.xml from APK
    // For now, return mock data
    
    const packageName = `com.example.app_${Date.now()}`;
    
    return {
      packageName,
      versionCode: 1,
      versionName: '1.0',
      applicationInfo: {
        packageName,
        name: 'Example App',
        className: `${packageName}.MainActivity`,
        icon: '',
        theme: '',
        sourceDir: `/data/app/${packageName}/base.apk`,
        dataDir: `/data/data/${packageName}`,
        nativeLibraryDir: `/data/app/${packageName}/lib`,
        flags: 0,
        enabled: true,
        targetSdkVersion: 30,
        minSdkVersion: 21,
      },
      activities: [
        {
          name: '.MainActivity',
          packageName,
          label: 'Main Activity',
          icon: '',
          launchMode: 0,
          screenOrientation: -1,
          configChanges: 0,
        },
      ],
      services: [],
      receivers: [],
      providers: [],
      permissions: [],
      requestedPermissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
      signatures: [],
      firstInstallTime: Date.now(),
      lastUpdateTime: Date.now(),
    };
  }
  
  /**
   * Get application info
   */
  getApplicationInfo(packageName: string): ApplicationInfo | null {
    const pkg = this.packages.get(packageName);
    return pkg?.applicationInfo || null;
  }
  
  /**
   * Get launch intent for package
   */
  getLaunchIntentForPackage(packageName: string): any | null {
    const pkg = this.packages.get(packageName);
    if (!pkg || pkg.activities.length === 0) return null;
    
    return {
      action: 'android.intent.action.MAIN',
      category: ['android.intent.category.LAUNCHER'],
      component: {
        packageName,
        className: pkg.activities[0].name,
      },
    };
  }
}
