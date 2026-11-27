// The app shell: picks the screen for the current route. Owned by the main session.

import { useEffect, useState } from 'react';
import { LoadingScreen, ToastHost } from '../components/ui';
import { AddPersonScreen } from '../screens/AddPerson';
import { AlbumScreen } from '../screens/Album';
import { HelpScreen } from '../screens/Help';
import { HomeScreen } from '../screens/Home';
import { InstallHintScreen } from '../screens/InstallHint';
import { LanguageScreen } from '../screens/Language';
import { PeopleScreen } from '../screens/People';
import { PersonDetailScreen } from '../screens/PersonDetail';
import { PinSetupScreen } from '../screens/PinSetup';
import { RecognizeScreen } from '../screens/Recognize';
import { SettingsScreen } from '../screens/Settings';
import { UnlockScreen } from '../screens/Unlock';
import { VoiceScreen } from '../screens/Voice';
import { useApp } from './appContext';
import { shouldSuggestHomeScreen } from './installHint';
import type { Route } from './navigation';

function CurrentScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'recognize':
      return <RecognizeScreen />;
    case 'album':
      return <AlbumScreen />;
    case 'voice':
      return <VoiceScreen />;
    case 'people':
      return <PeopleScreen />;
    case 'person':
      return <PersonDetailScreen key={route.personId} personId={route.personId} />;
    case 'addPerson':
      return <AddPersonScreen key={route.editId ?? 'new'} editId={route.editId} />;
    case 'settings':
      return <SettingsScreen />;
    case 'pin':
      return <PinSetupScreen />;
    case 'help':
      return <HelpScreen />;
  }
}

export function SiltaApp() {
  const { ready, loadFailed, settings, lang, route, screenCovered } = useApp();
  // iPhone browser tab only: ask to add Silta to the Home Screen before any family data is entered.
  const [suggestHomeScreen, setSuggestHomeScreen] = useState(shouldSuggestHomeScreen);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (loadFailed) return <LoadingScreen failed onRetry={() => window.location.reload()} />;
  if (!ready) return <LoadingScreen />;
  if (settings.lang === null) {
    return (
      <>
        <LanguageScreen />
        <ToastHost />
      </>
    );
  }

  if (suggestHomeScreen) return <InstallHintScreen onContinue={() => setSuggestHomeScreen(false)} />;

  // With a PIN set, caregiver screens wait behind the PIN screen. The screen underneath stays loaded
  // but out of sight, so a half-filled form is still there after the PIN is entered again.
  const gated = screenCovered;

  return (
    <>
      {gated ? <UnlockScreen /> : null}
      <div hidden={gated} inert={gated}>
        <CurrentScreen route={route} />
      </div>
      <ToastHost />
    </>
  );
}
