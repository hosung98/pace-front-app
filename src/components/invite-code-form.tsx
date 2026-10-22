import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PaceButton } from '@/components/pace-button';
import { PaceText as Text } from '@/components/pace-text';
import { PaceColors as C } from '@/constants/pace';

type InviteCodeFormProps = Readonly<{
  label: string;
  placeholder?: string;
  onSubmit: (code: string) => Promise<void>;
}>;

/** Code entry + submit. `onSubmit` should throw an Error whose message is shown inline. */
export function InviteCodeForm({ label, placeholder = '초대 코드를 입력해 주세요', onSubmit }: InviteCodeFormProps) {
  const pending = useRef(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (pending.current || !code.trim()) return;
    pending.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(code);
      setCode('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '참가하지 못했어요.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          value={code}
          editable={!submitting}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={C.subtle}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (code.trim()) void submit();
          }}
          style={styles.input}
        />
        <PaceButton
          label="참가"
          onPress={() => void submit()}
          disabled={!code.trim()}
          loading={submitting}
          style={styles.button}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 15,
    letterSpacing: 2,
  },
  button: { minWidth: 76 },
  error: { marginTop: 8, color: '#FF8A80', fontSize: 11 },
});
