import { Composition } from 'remotion';
import { AdVideo } from './AdVideo';
import { VIDEO } from './config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LetisAd"
        component={AdVideo}
        durationInFrames={VIDEO.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
