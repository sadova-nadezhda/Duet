import { ReactNode, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { haptic } from './common';

type Props<T> = {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, dragging: boolean) => ReactNode;
  /** Новый порядок после перетаскивания */
  onReorder: (data: T[]) => void;
  /** Блокировать прокрутку родителя, пока карточка «в руке» */
  onDragChange?: (dragging: boolean) => void;
  gap?: number;
};

/**
 * Список с сортировкой зажатием: долгое нажатие поднимает карточку, дальше её можно тащить.
 * Без нативных зависимостей — PanResponder работает и на iOS/Android, и в вебе.
 */
export function SortableList<T>({ data, keyOf, renderItem, onReorder, onDragChange, gap = 12 }: Props<T>) {
  const heights = useRef<Record<string, number>>({});
  const shifts = useRef<Record<string, Animated.Value>>({});
  const dy = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const grantedRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const shiftOf = (key: string) => (shifts.current[key] ??= new Animated.Value(0));

  /** Индекс, над которым сейчас центр перетаскиваемой карточки */
  const targetFor = (from: number, offset: number) => {
    const keys = dataRef.current.map(keyOf);
    const h = (i: number) => heights.current[keys[i]] ?? 0;
    let top = 0;
    for (let i = 0; i < from; i++) top += h(i);
    const center = top + h(from) / 2 + offset;
    let acc = 0;
    for (let i = 0; i < keys.length; i++) {
      acc += h(i);
      if (center < acc) return i;
    }
    return keys.length - 1;
  };

  const moveOthers = (from: number, to: number) => {
    const items = dataRef.current;
    const size = heights.current[keyOf(items[from])] ?? 0;
    items.forEach((item, i) => {
      if (i === from) return;
      const v = from < to && i > from && i <= to ? -size : from > to && i < from && i >= to ? size : 0;
      Animated.timing(shiftOf(keyOf(item)), { toValue: v, duration: 150, useNativeDriver: false }).start();
    });
  };

  const finish = () => {
    const from = activeRef.current;
    const to = targetRef.current;
    activeRef.current = targetRef.current = null;
    grantedRef.current = false;
    setActive(null);
    onDragChange?.(false);
    dy.setValue(0);
    Object.values(shifts.current).forEach((v) => v.setValue(0));
    if (from === null || to === null || from === to) return;
    const next = [...dataRef.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => activeRef.current !== null,
      onMoveShouldSetPanResponderCapture: () => activeRef.current !== null,
      onPanResponderGrant: () => {
        grantedRef.current = true;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const from = activeRef.current;
        if (from === null) return;
        dy.setValue(g.dy);
        const to = targetFor(from, g.dy);
        if (to !== targetRef.current) {
          targetRef.current = to;
          moveOthers(from, to);
          haptic();
        }
      },
      onPanResponderRelease: () => finish(),
      onPanResponderTerminate: () => finish(),
    }),
  ).current;

  const lift = (index: number) => {
    haptic();
    activeRef.current = targetRef.current = index;
    setActive(index);
    onDragChange?.(true);
  };

  return (
    <View {...responder.panHandlers}>
      {data.map((item, i) => {
        const key = keyOf(item);
        const dragging = active === i;
        return (
          <Animated.View
            key={key}
            onLayout={(e) => (heights.current[key] = e.nativeEvent.layout.height)}
            style={{
              paddingBottom: gap,
              zIndex: dragging ? 10 : 0,
              transform: [{ translateY: dragging ? dy : shiftOf(key) }, { scale: dragging ? 1.03 : 1 }],
              opacity: active !== null && !dragging ? 0.85 : 1,
            }}
          >
            <Pressable
              onLongPress={() => lift(i)}
              // Зажали и отпустили, не сдвинув: жест до PanResponder так и не дошёл — опускаем карточку сами.
              // Таймаут — потому что при перехвате жеста onPressOut тоже срабатывает, уже после grant.
              onPressOut={() => setTimeout(() => activeRef.current !== null && !grantedRef.current && finish())}
              delayLongPress={300}
            >
              {renderItem(item, dragging)}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
