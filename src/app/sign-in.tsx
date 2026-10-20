import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '@/components/AppHeader';
import { Button, FieldLabel, Input, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');

  const submit = async () => {
    setBusy(true);
    const creds = { email: email.trim(), password };
    const { error, data } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp({ ...creds, options: { data: { name: name.trim() || undefined } } });
    setBusy(false);
    if (error) return Alert.alert('Не получилось', error.message);
    if (mode === 'up' && !data.session) setAwaitingCode(true);
  };

  // Подтверждение почты кодом из письма (шаблон «Confirm signup» должен содержать {{ .Token }})
  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' });
    setBusy(false);
    if (error) Alert.alert('Неверный код', error.message);
    // при успехе сессия появится сама, и роутер откроет следующий экран
  };

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    Alert.alert(error ? 'Не получилось' : 'Готово', error ? error.message : 'Новый код отправлен на почту');
  };

  if (awaitingCode) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Txt variant="h2">Введите код</Txt>
          <Txt variant="muted" style={{ marginTop: 8, fontSize: 16 }}>
            Мы отправили код на {email.trim()}
          </Txt>
          <FieldLabel>Код из письма</FieldLabel>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={10}
            autoFocus
            style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }}
          />
          <Button label="Подтвердить" onPress={verify} disabled={busy || code.length < 6} style={{ marginTop: 24 }} />
          <Pressable onPress={resend} style={{ marginTop: 18, alignItems: 'center' }}>
            <Txt style={{ color: colors.accentLight }}>Отправить код ещё раз</Txt>
          </Pressable>
          <Pressable onPress={() => (setAwaitingCode(false), setCode(''))} style={{ marginTop: 12, alignItems: 'center' }}>
            <Txt variant="muted">Изменить email</Txt>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: 24 }}
      >
        <Logo size={44} />
        <Txt variant="muted" style={{ marginTop: 8, marginBottom: 16, fontSize: 16 }}>
          Общий дом, вишлист и фильмотека на двоих
        </Txt>

        {mode === 'up' && (
          <>
            <FieldLabel>Как вас зовут</FieldLabel>
            <Input value={name} onChangeText={setName} placeholder="Например, Аня" />
          </>
        )}
        <FieldLabel>Email</FieldLabel>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@mail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <FieldLabel>Пароль</FieldLabel>
        <Input value={password} onChangeText={setPassword} placeholder="Минимум 6 символов" secureTextEntry />

        <Button
          label={mode === 'in' ? 'Войти' : 'Создать аккаунт'}
          onPress={submit}
          disabled={busy || !email || password.length < 6}
          style={{ marginTop: 28 }}
        />
        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ marginTop: 18, alignItems: 'center' }}>
          <Txt style={{ color: colors.accentLight }}>{mode === 'in' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}</Txt>
        </Pressable>
        <View style={{ height: 40 }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
