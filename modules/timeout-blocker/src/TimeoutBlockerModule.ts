import { NativeModule, requireNativeModule } from 'expo';

declare class TimeoutBlockerModule extends NativeModule<{}> {
  isServiceEnabled(): boolean;
  openServiceSettings(): void;
  getLaunchableApps(): Promise<{ id: string; name: string }[]>;
  setBlock(apps: string[], active: boolean): void;
}

export default requireNativeModule<TimeoutBlockerModule>('TimeoutBlocker');
