import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

const MARK = 'timeout:v1';
// Brick tags carry a long hex token in an NDEF text record; accept them too.
const BRICK = /[0-9a-f]{64,}/i;

export const nfcSupported = () => NfcManager.isSupported().catch(() => false);

async function session<T>(alert: string, fn: () => Promise<T>): Promise<T> {
  await NfcManager.start();
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: alert });
    return await fn();
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/** Resolves true if a Timeout (or Brick) tag was tapped. Throws if cancelled / no tag. */
export const scanTag = () =>
  session('Hold your phone near your Timeout tag', async () => {
    const tag = await NfcManager.getTag();
    return !!tag?.ndefMessage?.some((r) => {
      const s = Ndef.util.bytesToString(r.payload);
      return s.includes(MARK) || BRICK.test(s);
    });
  });

/** Turns any blank NFC sticker into a Timeout tag. Works on every phone, not tied to this device. */
export const writeTag = () =>
  session('Hold your phone near a blank NFC sticker', async () => {
    const id = Math.random().toString(36).slice(2, 10);
    await NfcManager.ndefHandler.writeNdefMessage(Ndef.encodeMessage([Ndef.textRecord(`${MARK}:${id}`)]));
    return true;
  });
