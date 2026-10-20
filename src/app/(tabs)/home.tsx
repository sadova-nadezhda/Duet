import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Pills, ScreenTitle, Segmented, Screen } from '@/components/ui';
import { RecipeSheet, RecipesList, ReminderSheet, RemindersList, ShoppingList } from '@/features/home/other';
import { TaskSheet, TasksList } from '@/features/home/tasks';
import { useCoupleTable } from '@/hooks/useCoupleTable';
import type { Recipe, Reminder, ShoppingItem, Task } from '@/lib/types';

type Tab = 'shopping' | 'tasks' | 'recipes';
type TasksTab = 'list' | 'reminders';

export default function Home() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [sub, setSub] = useState<TasksTab>('list');

  const tasks = useCoupleTable<Task>('tasks');
  const reminders = useCoupleTable<Reminder>('reminders');
  const shopping = useCoupleTable<ShoppingItem>('shopping_items');
  const recipes = useCoupleTable<Recipe>('recipes');

  const [taskSheet, setTaskSheet] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null });
  const [remSheet, setRemSheet] = useState<{ open: boolean; editing: Reminder | null }>({ open: false, editing: null });
  const [recSheet, setRecSheet] = useState<{ open: boolean; editing: Recipe | null }>({ open: false, editing: null });

  const onAdd = () => {
    if (tab === 'tasks' && sub === 'list') setTaskSheet({ open: true, editing: null });
    if (tab === 'tasks' && sub === 'reminders') setRemSheet({ open: true, editing: null });
    if (tab === 'recipes') setRecSheet({ open: true, editing: null });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Дом" onAdd={tab === 'shopping' ? undefined : onAdd} />
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { key: 'tasks', label: 'Дела' },
            { key: 'shopping', label: 'Покупки' },
            { key: 'recipes', label: 'Рецепты' },
          ]}
        />

        {tab === 'tasks' && (
          <>
            <Pills
              value={sub}
              onChange={setSub}
              items={[
                { key: 'list', label: 'Список дел' },
                { key: 'reminders', label: 'Напоминания' },
              ]}
            />
            {sub === 'list' ? (
              <TasksList
                tasks={tasks.rows}
                update={tasks.update}
                remove={tasks.remove}
                onEdit={(t) => setTaskSheet({ open: true, editing: t })}
              />
            ) : (
              <RemindersList
                rows={reminders.rows}
                update={reminders.update}
                remove={reminders.remove}
                onEdit={(r) => setRemSheet({ open: true, editing: r })}
              />
            )}
          </>
        )}
        {tab !== 'tasks' && <View style={{ height: 20 }} />}
        {tab === 'shopping' && (
          <ShoppingList rows={shopping.rows} insert={shopping.insert} update={shopping.update} remove={shopping.remove} />
        )}
        {tab === 'recipes' && (
          <RecipesList rows={recipes.rows} remove={recipes.remove} onEdit={(r) => setRecSheet({ open: true, editing: r })} />
        )}
      </ScrollView>

      <TaskSheet
        visible={taskSheet.open}
        editing={taskSheet.editing}
        onClose={() => setTaskSheet({ open: false, editing: null })}
        onSave={(v) => (taskSheet.editing ? tasks.update(taskSheet.editing.id, v) : tasks.insert(v))}
      />
      <ReminderSheet
        visible={remSheet.open}
        editing={remSheet.editing}
        onClose={() => setRemSheet({ open: false, editing: null })}
        onSave={(v) => (remSheet.editing ? reminders.update(remSheet.editing.id, v) : reminders.insert(v))}
      />
      <RecipeSheet
        visible={recSheet.open}
        editing={recSheet.editing}
        onClose={() => setRecSheet({ open: false, editing: null })}
        onSave={(v) => (recSheet.editing ? recipes.update(recSheet.editing.id, v) : recipes.insert(v))}
      />
    </Screen>
  );
}
