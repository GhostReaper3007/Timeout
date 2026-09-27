import { Platform } from 'react-native';
import * as ST from 'react-native-device-activity';
import Android from '../modules/timeout-blocker';

export const SELECTION_ID = 'timeout';
const ios = Platform.OS === 'ios';

export const hasPermission = () =>
  ios ? ST.getAuthorizationStatus() === ST.AuthorizationStatus.approved : Android.isServiceEnabled();

export const requestPermission = async () =>
  ios ? ST.requestAuthorization('individual') : Android.openServiceSettings();

export const getApps = () => Android.getLaunchableApps();

export function setLocked(locked: boolean, androidApps: string[]) {
  if (!ios) return Android.setBlock(androidApps, locked);
  if (!locked) return ST.resetBlocks();
  ST.updateShield(
    {
      title: 'Taking a Timeout',
      subtitle: 'Tap your Timeout tag to get this app back.',
      primaryButtonLabel: 'Okay',
      backgroundColor: { red: 255, green: 247, blue: 238 },
      titleColor: { red: 29, green: 27, blue: 46 },
      subtitleColor: { red: 124, green: 120, blue: 145 },
      primaryButtonBackgroundColor: { red: 255, green: 106, blue: 77 },
      primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
    },
    { primary: { behavior: 'close' } },
  );
  ST.blockSelection({ activitySelectionId: SELECTION_ID });
}
