import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Couple, Profile } from '@/lib/types';

type AuthState = {
  loading: boolean;
  session: Session | null;
  me: Profile | null;
  partner: Profile | null;
  couple: Couple | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Имя по id: «Я» для себя, имя партнёра для него */
  nameOf: (id: string | null) => string;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setMe(null);
      setPartner(null);
      setCouple(null);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setMe(profile ?? null);
    if (profile?.couple_id) {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('couples').select('*').eq('id', profile.couple_id).single(),
        supabase.from('profiles').select('*').eq('couple_id', profile.couple_id).neq('id', uid).maybeSingle(),
      ]);
      setCouple(c ?? null);
      setPartner(p ?? null);
    } else {
      setCouple(null);
      setPartner(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // вызов supabase внутри колбэка откладываем, чтобы не заблокировать auth-лок
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Партнёр присоединился по коду → обновить профиль на лету
  useEffect(() => {
    if (!me?.couple_id) return;
    const ch = supabase
      .channel(`profiles-${me.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${me.couple_id}` }, () =>
        loadProfile(me.id),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${me.couple_id}` }, () =>
        loadProfile(me.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me?.couple_id, me?.id, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      me,
      partner,
      couple,
      refresh: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut();
      },
      nameOf: (id) => (id === null ? 'Общее' : id === me?.id ? 'Я' : id === partner?.id ? partner.name : '—'),
    }),
    [loading, session, me, partner, couple, loadProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth вне AuthProvider');
  return v;
}
