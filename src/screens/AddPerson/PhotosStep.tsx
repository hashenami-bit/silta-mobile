import { newId } from '../../lib/id';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import {
  DeviceOnPill,
  DeviceProblem,
  OvalGuide,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from '../../components/ui';
import type { TextKey } from '../../i18n';
import { useCamera } from '../../lib/camera';
import { FACE } from '../../lib/config';
import { capturePhoto, getFaceEngine } from '../../lib/face';
import type { PersonPhoto } from '../../lib/types';
import type { ListUpdater } from './draft';

const SHOT_KEYS: TextKey[] = [
  'add.shot.straight',
  'add.shot.left',
  'add.shot.right',
  'add.shot.glasses',
  'add.shot.light',
];

interface Props {
  name: string;
  photos: PersonPhoto[];
  setPhotos: ListUpdater<PersonPhoto>;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = dataUrl;
  });
}

export function PhotosStep({ name, photos, setPhotos }: Props) {
  const { t, lang } = useApp();
  const { state, videoRef, start, stop, switchFacing } = useCamera();
  const [checking, setChecking] = useState(false);
  const [noFace, setNoFace] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Loads the face files. Returns false (and shows the error panel) when that fails.
  async function loadEngine(): Promise<boolean> {
    const ok = await getFaceEngine()
      .load()
      .then(
        () => true,
        () => false,
      );
    if (aliveRef.current) setLoadFailed(!ok);
    return ok;
  }

  async function startPhotoCamera() {
    setLoadFailed(false);
    const loading = loadEngine();
    await start('environment');
    await loading;
  }

  async function retryLoad() {
    setChecking(true);
    await loadEngine();
    if (aliveRef.current) setChecking(false);
  }

  async function shoot() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || checking || loadFailed) return;
    setChecking(true);
    setNoFace(false);
    let photo: PersonPhoto | null = null;
    try {
      const dataUrl = capturePhoto(video);
      const image = await loadImage(dataUrl);
      const found = await getFaceEngine().describe(image);
      if (found) {
        photo = { id: newId(), dataUrl, descriptor: found.descriptor, createdAt: Date.now() };
      }
    } catch {
      photo = null;
    }
    if (!aliveRef.current) return;
    if (photo) {
      const added = photo;
      setPhotos((prev) => (prev.length >= FACE.photosMax ? prev : [...prev, added]));
    } else {
      setNoFace(true);
    }
    setChecking(false);
  }

  function remove(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const full = photos.length >= FACE.photosMax;
  const shotKey = SHOT_KEYS[Math.min(photos.length, SHOT_KEYS.length - 1)];
  const missing = FACE.photosMin - photos.length;

  let cameraArea;
  if (state.status === 'error') {
    cameraArea = (
      <DeviceProblem
        kind="camera"
        error={state.error}
        onRetry={() => void startPhotoCamera()}
        onBack={stop}
      />
    );
  } else if (state.status === 'starting') {
    cameraArea = (
      <p role="status" className="py-10 text-center font-display text-title text-ink">
        {t('recognize.starting')}
      </p>
    );
  } else if (state.status === 'ready') {
    cameraArea = (
      <div className="space-y-4">
        <div className="relative flex h-[28rem] items-center justify-center overflow-hidden rounded-card bg-night">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover${state.facing === 'user' ? ' -scale-x-100' : ''}`}
          />
          <div className="absolute left-3 top-3">
            <DeviceOnPill kind="camera" />
          </div>
          <div className="relative">
            <OvalGuide caption={t(shotKey)} />
          </div>
        </div>
        <p role="status" className="text-center text-body text-ink-soft">
          {checking ? t('add.photos.checking') : t('add.photos.count', { count: photos.length, max: FACE.photosMax })}
        </p>
        {loadFailed ? (
          <Panel tone="lantern" role="alert">
            <p>{t('error.generic')}</p>
            <div className="mt-3">
              <SecondaryButton onClick={() => void retryLoad()} disabled={checking}>
                {t('common.tryAgain')}
              </SecondaryButton>
            </div>
          </Panel>
        ) : null}
        {noFace && !loadFailed ? (
          <Panel tone="lantern" role="status" title={t('add.photos.noFace.title')}>
            <p>{t('add.photos.noFace.body')}</p>
            <div className="mt-3">
              <SecondaryButton onClick={() => setNoFace(false)}>{t('common.tryAgain')}</SecondaryButton>
            </div>
          </Panel>
        ) : null}
        <PrimaryButton
          icon={<Camera />}
          onClick={() => void shoot()}
          disabled={checking || full || loadFailed}
        >
          {t('add.photos.take')}
        </PrimaryButton>
        <SecondaryButton icon={<SwitchCamera />} onClick={() => void switchFacing()}>
          {t('recognize.switch')}
        </SecondaryButton>
      </div>
    );
  } else {
    cameraArea = (
      <PrimaryButton icon={<Camera />} onClick={() => void startPhotoCamera()}>
        {t('add.photos.start')}
      </PrimaryButton>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-title text-ink">{t('add.photos.title')}</h2>
        <p className="mt-2 text-body text-ink-soft">{t('add.photos.intro')}</p>
      </div>
      {cameraArea}
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <li key={p.id} className="flex w-24 flex-col items-center gap-1">
              <img
                src={p.dataUrl}
                alt={t('common.photoOf', { name: name.trim() || t('add.photos.title') })}
                className="h-20 w-20 rounded-tile object-cover"
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={t('add.photos.remove')}
                className="inline-flex min-h-tap w-full flex-col items-center justify-center rounded-btn text-caption font-semibold text-river"
              >
                <X aria-hidden="true" />
                <span lang={lang}>{t('add.photos.remove')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {missing > 0 ? <p className="text-body text-ink-soft">{t('add.photos.need', { count: missing })}</p> : null}
    </div>
  );
}
