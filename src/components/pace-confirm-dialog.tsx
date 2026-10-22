import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { PaceText as Text } from './pace-text';
import { PaceColors as C } from '@/constants/pace';

export function PaceConfirmDialog({ visible, title, message, onConfirm, onCancel }: Readonly<{
  visible: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
}>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}>
              <Text style={styles.text}>취소</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.button, styles.confirm]}>
              <Text style={styles.confirmText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000AA' },
  dialog: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 22, backgroundColor: C.surface },
  title: { color: C.text, fontSize: 16, fontWeight: '700' },
  message: { marginTop: 12, color: C.muted, fontSize: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.raised },
  confirm: { backgroundColor: C.accent },
  text: { color: C.text, fontSize: 12 },
  confirmText: { color: C.accentInk, fontSize: 12, fontWeight: '700' },
});
