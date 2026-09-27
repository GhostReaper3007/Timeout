import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Alert, AppState, FlatList, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { DeviceActivitySelectionSheetViewPersisted } from 'react-native-device-activity';
import { C, R } from './src/brand';
import { SELECTION_ID, getApps, hasPermission, requestPermission, setLocked } from './src/blocker';
import { nfcSupported, scanTag, writeTag } from './src/nfc';
import { State, WEEKLY_EMERGENCIES, emergenciesLeft, nextReset, useStore, weekStart } from './src/store';

type Set = (p: Partial<State>) => void;

const SLIDES = [
  { icon: '⏸', title: 'Welcome to Timeout', body: 'A little pause button for your phone. Pick the apps that eat your time, then lock them away with a tap.' },
  { icon: '🏷️', title: 'Your tag is the key', body: 'Timeout uses a small NFC sticker. Tap it to start a Timeout, and tap it again to end one. Leave it somewhere out of reach — the kitchen, your desk, the car.' },
  { icon: '👨‍👩‍👧', title: 'One tag, every phone', body: 'Tags aren’t tied to one device. Any Timeout tag unlocks any phone running Timeout, so the whole family can share one.' },
  { icon: '🆘', title: `${WEEKLY_EMERGENCIES} emergency unlocks a week`, body: 'Away from your tag and really need your apps? Use an emergency unlock. You get three, and they refill every Monday.' },
];

export default function App() {
  const [s, set] = useStore();
  if (!s) return <View style={st.screen} />;
  return (
    <SafeAreaView style={st.screen}>
      <StatusBar style="dark" />
      {s.onboarded ? <Home s={s} set={set} /> : <Onboarding s={s} set={set} />}
    </SafeAreaView>
  );
}

/* ---------------- Tutorial + setup ---------------- */

function Onboarding({ s, set }: { s: State; set: Set }) {
  const [i, setI] = useState(0);
  const [allowed, setAllowed] = useState(hasPermission());
  const [picker, setPicker] = useState(false);
  const [tagReady, setTagReady] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', () => setAllowed(hasPermission()));
    return () => sub.remove();
  }, []);

  if (i < SLIDES.length) {
    const sl = SLIDES[i];
    return (
      <View style={st.pad}>
        <Pressable onPress={() => setI(SLIDES.length)} style={{ alignSelf: 'flex-end' }}>
          <Text style={st.link}>Skip</Text>
        </Pressable>
        <View style={st.center}>
          <View style={[st.bubble, { backgroundColor: i % 2 ? C.mintSoft : C.coralSoft }]}>
            <Text style={{ fontSize: 64 }}>{sl.icon}</Text>
          </View>
          <Text style={st.h1}>{sl.title}</Text>
          <Text style={st.body}>{sl.body}</Text>
        </View>
        <Dots n={SLIDES.length} i={i} />
        <Btn label={i === SLIDES.length - 1 ? 'Let’s set it up' : 'Next'} onPress={() => setI(i + 1)} />
      </View>
    );
  }

  const tag = async () => {
    if (!(await nfcSupported())) return Alert.alert('No NFC', 'This phone can’t read NFC tags.');
    try {
      await writeTag();
      ok();
      setTagReady(true);
    } catch {
      Alert.alert('Didn’t catch that', 'Hold the top of your phone flat against the sticker and try again.');
    }
  };
  const test = async () => {
    try {
      if (await scanTag()) return ok(), setTagReady(true);
      Alert.alert('Not a Timeout tag', 'Tap “Set up a new tag” to turn this sticker into one.');
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.h1}>Quick setup</Text>
      <Text style={st.body}>Three steps and you’re ready.</Text>

      <Step n={1} done={allowed} title={Platform.OS === 'ios' ? 'Allow Screen Time access' : 'Turn on Timeout in Accessibility'}
        body={Platform.OS === 'ios'
          ? 'Lets Timeout lock the apps you choose. Nothing leaves your phone.'
          : 'In the list that opens, tap “Timeout”, then switch it on. This is how Timeout closes blocked apps.'}>
        {!allowed && <Btn small label="Allow" onPress={async () => { await requestPermission(); setAllowed(hasPermission()); }} />}
      </Step>

      <Step n={2} done={s.appCount > 0} title="Choose apps to lock" body={s.appCount ? `${s.appCount} selected` : 'Social, games, video — whatever pulls you in.'}>
        <Btn small label={s.appCount ? 'Change' : 'Choose apps'} onPress={() => setPicker(true)} />
      </Step>

      <Step n={3} done={tagReady} title="Set up your tag"
        body="Grab any NTAG213/215/216 sticker. Tap “Set up a new tag” and hold it to the top of your phone (iPhone) or the middle of the back (Android). Already have a Timeout or Brick tag? Just test it.">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn small label="Set up a new tag" onPress={tag} />
          <Btn small ghost label="Test a tag" onPress={test} />
        </View>
      </Step>

      <Btn label="Start using Timeout" disabled={!allowed || !s.appCount || !tagReady} onPress={() => set({ onboarded: true })} />
      <AppPicker visible={picker} s={s} set={set} onClose={() => setPicker(false)} />
    </ScrollView>
  );
}

/* ---------------- Home ---------------- */

function Home({ s, set }: { s: State; set: Set }) {
  const [tagMissing, setTagMissing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [, tick] = useState(0);
  const left = emergenciesLeft(s);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const apply = (locked: boolean) => {
    setLocked(locked, s.apps);
    set({ locked, lockedAt: locked ? Date.now() : null });
    setTagMissing(false);
    ok();
  };

  const tap = async () => {
    if (!hasPermission()) return requestPermission();
    try {
      if (await scanTag()) return apply(!s.locked);
      Alert.alert('Not a Timeout tag', 'That tag isn’t set up for Timeout.');
    } catch {
      if (s.locked) setTagMissing(true);
    }
  };

  const emergency = () =>
    Alert.alert('Use an emergency unlock?', `You’ll have ${left - 1} left until ${nextReset()}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        style: 'destructive',
        onPress: () => {
          const week = weekStart();
          set({ emergency: { week, used: (s.emergency.week === week ? s.emergency.used : 0) + 1 } });
          apply(false);
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={st.pad}>
      <View style={st.row}>
        <Text style={st.logo}>timeout<Text style={{ color: C.coral }}>.</Text></Text>
        <View style={[st.chip, { backgroundColor: s.locked ? C.coralSoft : C.mintSoft }]}>
          <Text style={{ color: s.locked ? C.coral : C.mint, fontWeight: '700' }}>{s.locked ? 'On a Timeout' : 'Free'}</Text>
        </View>
      </View>

      <View style={[st.center, { paddingVertical: 32 }]}>
        <Pressable onPress={tap} style={({ pressed }) => [st.orb, { backgroundColor: s.locked ? C.coral : C.ink, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <Text style={st.orbIcon}>{s.locked ? '⏸' : '▶'}</Text>
          <Text style={st.orbText}>{s.locked ? 'Tap tag to end' : 'Tap tag to start'}</Text>
        </Pressable>
        <Text style={[st.body, { marginTop: 20 }]}>
          {s.locked
            ? `${s.appCount} apps locked · ${since(s.lockedAt)}`
            : `${s.appCount} apps will be locked`}
        </Text>
      </View>

      {s.locked && tagMissing && (
        <View style={[st.card, { borderColor: C.coral }]}>
          <Text style={st.h3}>Can’t reach your tag?</Text>
          <Text style={st.body}>
            {left > 0
              ? `You have ${left} of ${WEEKLY_EMERGENCIES} emergency unlocks this week.`
              : `You’re out of emergency unlocks. They refill ${nextReset()}.`}
          </Text>
          {left > 0 && <Btn small label="Emergency unlock" onPress={emergency} />}
        </View>
      )}

      <View style={st.card}>
        <View style={st.row}>
          <Text style={st.h3}>Emergency unlocks</Text>
          <Text style={st.body}>{'●'.repeat(left)}{'○'.repeat(WEEKLY_EMERGENCIES - left)}</Text>
        </View>
        <Text style={st.muted}>Refills {nextReset()}</Text>
      </View>

      {!s.locked && (
        <View style={st.card}>
          <Row label="Choose apps to lock" onPress={() => setPicker(true)} />
          <Row label="Set up a new tag" onPress={() => writeTag().then(() => ok(), () => {})} />
          <Row label="Replay the tutorial" onPress={() => set({ onboarded: false })} />
        </View>
      )}
      <AppPicker visible={picker} s={s} set={set} onClose={() => setPicker(false)} />
    </ScrollView>
  );
}

/* ---------------- App picker ---------------- */

function AppPicker({ visible, s, set, onClose }: { visible: boolean; s: State; set: Set; onClose: () => void }) {
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (visible && Platform.OS === 'android') getApps().then(setApps);
  }, [visible]);

  if (Platform.OS === 'ios')
    return visible ? (
      <DeviceActivitySelectionSheetViewPersisted
        style={{ width: 1, height: 1, position: 'absolute' }}
        familyActivitySelectionId={SELECTION_ID}
        onSelectionChange={(e) => {
          const m = e.nativeEvent;
          set({ appCount: m.applicationCount + m.categoryCount + m.webDomainCount });
        }}
        onDismissRequest={onClose}
      />
    ) : null;

  const toggle = (id: string) => {
    const next = s.apps.includes(id) ? s.apps.filter((a) => a !== id) : [...s.apps, id];
    set({ apps: next, appCount: next.length });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={st.screen}>
        <View style={[st.row, { padding: 20 }]}>
          <Text style={st.h1}>Apps to lock</Text>
          <Pressable onPress={onClose}><Text style={st.link}>Done</Text></Pressable>
        </View>
        <FlatList
          data={apps}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggle(item.id)} style={[st.row, st.appRow]}>
              <Text style={st.body}>{item.name}</Text>
              <Switch value={s.apps.includes(item.id)} onValueChange={() => toggle(item.id)} trackColor={{ true: C.coral }} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

/* ---------------- Bits ---------------- */

const ok = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

function since(t: number | null) {
  const m = Math.floor((Date.now() - (t ?? Date.now())) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Btn({ label, onPress, small, ghost, disabled }: { label: string; onPress: () => void; small?: boolean; ghost?: boolean; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress}
      style={({ pressed }) => [st.btn, small && st.btnSmall, ghost && st.btnGhost, { opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }]}>
      <Text style={[st.btnText, small && { fontSize: 15 }, ghost && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

function Step({ n, done, title, body, children }: { n: number; done: boolean; title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={[st.num, done && { backgroundColor: C.mint }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{done ? '✓' : n}</Text>
        </View>
        <Text style={[st.h3, { flex: 1 }]}>{title}</Text>
      </View>
      <Text style={st.body}>{body}</Text>
      {children}
    </View>
  );
}

const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[st.row, { paddingVertical: 12 }]}>
    <Text style={st.body}>{label}</Text>
    <Text style={st.muted}>›</Text>
  </Pressable>
);

const Dots = ({ n, i }: { n: number; i: number }) => (
  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
    {Array.from({ length: n }, (_, k) => (
      <View key={k} style={{ height: 8, width: k === i ? 24 : 8, borderRadius: 4, backgroundColor: k === i ? C.coral : C.line }} />
    ))}
  </View>
);

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { flexGrow: 1, padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bubble: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logo: { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800', color: C.ink, textAlign: 'center', letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '700', color: C.ink },
  body: { fontSize: 16, lineHeight: 23, color: C.ink, textAlign: 'left' },
  muted: { fontSize: 14, color: C.muted },
  link: { fontSize: 16, color: C.coral, fontWeight: '700' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 20, gap: 10, borderWidth: 1, borderColor: C.line },
  orb: { width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.ink, shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  orbIcon: { fontSize: 56, color: '#fff' },
  orbText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: C.coral, borderRadius: R.pill, paddingVertical: 18, alignItems: 'center' },
  btnSmall: { paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.ink },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  appRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
});
