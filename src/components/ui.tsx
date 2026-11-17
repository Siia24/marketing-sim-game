import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  selected,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        selected && styles.selected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' ? styles.primaryText : styles.secondaryText,
          variant === 'ghost' && styles.ghostText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center' },
  column: { width: '100%', maxWidth: theme.maxWidth, gap: 16 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: theme.ink },
  muted: { fontSize: 16, lineHeight: 24, color: theme.muted },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 16,
    gap: 10,
  },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line },
  ghost: { backgroundColor: 'transparent', minHeight: 40 },
  selected: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, lineHeight: 22 },
  primaryText: { color: '#ffffff', fontWeight: '600', textAlign: 'center' },
  secondaryText: { color: theme.ink, textAlign: 'left' },
  ghostText: { color: theme.accent, fontWeight: '600', textAlign: 'left' },
});
