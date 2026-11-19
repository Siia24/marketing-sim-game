import { useEffect, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';

/** Короткое появление: прозрачность и масштаб. Без этого на карте ничего не крутится. */
export function Rise({ children }: { children: ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.86));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return <Animated.View style={{ opacity, transform: [{ scale }] }}>{children}</Animated.View>;
}
