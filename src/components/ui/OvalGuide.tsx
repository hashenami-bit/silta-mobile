import { useApp } from '../../app/appContext';

export interface OvalGuideProps {
  /** Defaults to `recognize.guide`. */
  caption?: string;
}

/** Static oval for camera views. Put it over the video, centred. */
export function OvalGuide({ caption }: OvalGuideProps) {
  const { t } = useApp();
  return (
    <div className="pointer-events-none flex flex-col items-center gap-4">
      <div aria-hidden="true" className="h-80 w-64 rounded-[50%] border-4 border-white/70" />
      <p className="px-5 text-center text-body font-semibold text-white">{caption ?? t('recognize.guide')}</p>
    </div>
  );
}
