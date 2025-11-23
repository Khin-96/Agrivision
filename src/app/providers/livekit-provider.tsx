'use client';

import { ReactNode } from 'react';
import { LiveKitRoom } from '@livekit/components-react';

interface LiveKitProviderProps {
  children: ReactNode;
  token: string;
  serverUrl: string;
}

export const LiveKitProvider = ({ children, token, serverUrl }: LiveKitProviderProps) => {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      {children}
    </LiveKitRoom>
  );
};
