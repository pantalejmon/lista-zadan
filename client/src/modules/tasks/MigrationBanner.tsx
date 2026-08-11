import { useState, useEffect } from 'react';
import * as db from '@modules/tasks/db';
import type { TodoStorage } from '@modules/tasks/storage';

const MIGRATED_KEY = 'todos-migrated-to-cloud';

interface MigrationBannerProps {
  storage: TodoStorage;
  listId?: string;
  onMigrated: () => void;
}

export function MigrationBanner({ storage, listId, onMigrated }: MigrationBannerProps) {
  const [localCount, setLocalCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(MIGRATED_KEY)) {
      return;
    }
    db.getAllTodos().then((todos) => {
      if (todos.length > 0) {
        setLocalCount(todos.length);
        setVisible(true);
      }
    });
  }, []);

  if (!visible) {
    return null;
  }

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const localTodos = await db.getAllTodos();
      for (const todo of localTodos) {
        await storage.addTodo({ ...todo, listId });
      }
      window.localStorage.setItem(MIGRATED_KEY, '1');
      setVisible(false);
      onMigrated();
    } finally {
      setMigrating(false);
    }
  };

  const handleDismiss = () => {
    window.localStorage.setItem(MIGRATED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-3">
      <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-2xl p-3 animate-fadeIn">
        <p className="text-sm text-primary-800 dark:text-primary-300">
          Masz <strong>{localCount}</strong> {localCount === 1 ? 'zadanie' : localCount < 5 ? 'zadania' : 'zadań'} zapisanych
          lokalnie. Chcesz przenieść je do chmury?
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {migrating ? 'Przenoszę...' : 'Przenieś'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Nie, zostaw
          </button>
        </div>
      </div>
    </div>
  );
}
