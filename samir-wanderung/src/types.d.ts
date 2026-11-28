declare module 'maplibre-contour' {
  const mlcontour: {
    DemSource: new (opts: { url: string; encoding: 'terrarium' | 'mapbox'; maxzoom: number; worker?: boolean }) => {
      setupMaplibre(maplibre: unknown): void;
      contourProtocolUrl(opts: Record<string, unknown>): string;
    };
  };
  export default mlcontour;
}

// WebCodecs audio types (not yet in TypeScript's DOM lib for this version).
interface EncodedAudioChunk { readonly byteLength: number; readonly timestamp: number; readonly duration: number | null; readonly type: 'key' | 'delta'; copyTo(dest: BufferSource): void }
interface EncodedAudioChunkMetadata { decoderConfig?: { codec: string; sampleRate: number; numberOfChannels: number; description?: BufferSource } }
interface AudioEncoderConfig { codec: string; sampleRate: number; numberOfChannels: number; bitrate?: number }
declare class AudioData {
  constructor(init: { format: 'f32-planar' | 'f32' | 's16'; sampleRate: number; numberOfFrames: number; numberOfChannels: number; timestamp: number; data: BufferSource });
  close(): void;
}
declare class AudioEncoder {
  constructor(init: { output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void; error: (e: DOMException) => void });
  static isConfigSupported(c: AudioEncoderConfig): Promise<{ supported: boolean }>;
  configure(c: AudioEncoderConfig): void;
  encode(d: AudioData): void;
  flush(): Promise<void>;
  close(): void;
  readonly state: 'unconfigured' | 'configured' | 'closed';
}
