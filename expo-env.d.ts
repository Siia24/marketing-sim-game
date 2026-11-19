/// <reference types="expo/types" />

declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
