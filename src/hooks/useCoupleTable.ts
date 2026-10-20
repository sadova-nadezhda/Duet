import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type Options = {
  orderBy?: string;
  ascending?: boolean;
  /** Таблицы без couple_id (gift_reservations, movie_ratings) — RLS сама отфильтрует */
  noCoupleFilter?: boolean;
};

/**
 * Загружает строки таблицы пары и держит их в синхроне через Supabase Realtime.
 * Возвращает rows + CRUD-хелперы с оптимистичным обновлением.
 */
export function useCoupleTable<T extends Record<string, any>>(table: string, opts: Options = {}) {
  const { me } = useAuth();
  const coupleId = me?.couple_id;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const optsRef = useRef(opts);
  const pk = table === 'gift_reservations' ? 'wish_id' : 'id';

  const load = useCallback(async () => {
    if (!coupleId) return;
    const o = optsRef.current;
    let q = supabase.from(table).select('*');
    if (!o.noCoupleFilter) q = q.eq('couple_id', coupleId);
    q = q.order(o.orderBy ?? 'created_at', { ascending: o.ascending ?? true });
    const { data, error } = await q;
    if (!error && data) setRows(data as T[]);
    setLoading(false);
  }, [table, coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    load();
    const filter = optsRef.current.noCoupleFilter ? undefined : `couple_id=eq.${coupleId}`;
    const ch = supabase
      .channel(`${table}-${coupleId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, coupleId, load]);

  const insert = useCallback(
    async (values: Partial<T>) => {
      const { data, error } = await supabase
        .from(table)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      setRows((r) => [...r.filter((x) => x[pk] !== (data as T)[pk]), data as T]);
      return data as T;
    },
    [table, pk],
  );

  const update = useCallback(
    async (id: string, values: Partial<T>) => {
      setRows((r) => r.map((x) => (x[pk] === id ? { ...x, ...values } : x)));
      const { error } = await supabase
        .from(table)
        .update(values as any)
        .eq(pk, id);
      if (error) {
        load();
        throw error;
      }
    },
    [table, pk, load],
  );

  const remove = useCallback(
    async (id: string) => {
      setRows((r) => r.filter((x) => x[pk] !== id));
      const { error } = await supabase.from(table).delete().eq(pk, id);
      if (error) {
        load();
        throw error;
      }
    },
    [table, pk, load],
  );

  return { rows, loading, reload: load, insert, update, remove, setRows };
}
