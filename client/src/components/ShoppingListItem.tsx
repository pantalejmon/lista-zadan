import { useState, useEffect, useRef } from 'react';
import type { Todo, ShoppingItem } from '../lib/types';
import { isShoppingComplete, shoppingProgress } from '../lib/types';

interface ShoppingListItemProps {
  todo: Todo;
  onUpdate: (updated: Todo) => Promise<void> | void;
  onDelete: (id: string) => void;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      return a.checked ? 1 : -1;
    }
    return a.order - b.order;
  });
}

export function ShoppingListItem({ todo, onUpdate, onDelete }: ShoppingListItemProps) {
  const items = todo.items ?? [];
  const { done, total, ratio } = shoppingProgress(items);
  const fullyComplete = isShoppingComplete(items);

  // Auto-collapse on full completion; auto-expand when uncompleting (handled in toggle/add handlers)
  const [expanded, setExpanded] = useState(!fullyComplete);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(todo.text);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const editItemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingItemId) {
      editItemInputRef.current?.focus();
      editItemInputRef.current?.select();
    }
  }, [editingItemId]);

  const pushItems = (next: ShoppingItem[]) => {
    return onUpdate({
      ...todo,
      items: next,
      completed: next.length > 0 && next.every((i) => i.checked),
    });
  };

  const handleToggleItem = (itemId: string) => {
    const next = items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i));
    const nextComplete = next.length > 0 && next.every((i) => i.checked);
    if (nextComplete && !fullyComplete) {
      setExpanded(false);
    } else if (!nextComplete && fullyComplete) {
      setExpanded(true);
    }
    void pushItems(next);
  };

  const handleAddItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) {
      return;
    }
    const nextOrder = items.length === 0 ? 0 : Math.max(...items.map((i) => i.order)) + 1;
    const next: ShoppingItem[] = [
      ...items,
      { id: generateId(), text: trimmed, checked: false, order: nextOrder },
    ];
    setNewItemText('');
    void pushItems(next);
    // Keep focus for fast multi-add
    setTimeout(() => newItemInputRef.current?.focus(), 0);
  };

  const handleDeleteItem = (itemId: string) => {
    void pushItems(items.filter((i) => i.id !== itemId));
  };

  const handleSaveItemEdit = () => {
    if (!editingItemId) {
      return;
    }
    const trimmed = editingItemText.trim();
    if (!trimmed) {
      handleDeleteItem(editingItemId);
    } else {
      void pushItems(items.map((i) => (i.id === editingItemId ? { ...i, text: trimmed } : i)));
    }
    setEditingItemId(null);
    setEditingItemText('');
  };

  const handleSaveTitle = () => {
    const trimmed = titleText.trim();
    if (!trimmed) {
      setTitleText(todo.text);
    } else if (trimmed !== todo.text) {
      void onUpdate({ ...todo, text: trimmed });
    }
    setEditingTitle(false);
  };

  const sorted = sortItems(items);
  const circumference = 2 * Math.PI * 9; // r=9

  return (
    <div
      className={`
        animate-fade-in rounded-2xl
        bg-white dark:bg-gray-800/80
        border border-gray-100 dark:border-gray-800
        shadow-sm transition-all duration-200
        ${fullyComplete ? 'opacity-60' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        {/* Progress donut + cart */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-shrink-0 relative w-7 h-7 flex items-center justify-center active:scale-90 transition-transform"
          aria-label={fullyComplete ? 'Lista ukończona' : `${done} z ${total} zakupów`}
        >
          <svg className="w-7 h-7 -rotate-90 absolute inset-0" viewBox="0 0 24 24">
            <circle
              cx="12" cy="12" r="9"
              fill="none" strokeWidth="2.5"
              className="text-gray-200 dark:text-gray-700"
              stroke="currentColor"
            />
            <circle
              cx="12" cy="12" r="9"
              fill="none" strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
              strokeLinecap="round"
              className={fullyComplete ? 'text-emerald-500' : 'text-primary-500'}
              stroke="currentColor"
              style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.2s ease' }}
            />
          </svg>
          {fullyComplete ? (
            <svg className="w-3.5 h-3.5 text-emerald-500 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.6 4h13.2M9 21a1 1 0 11-2 0 1 1 0 012 0zm10 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          )}
        </button>

        {/* Title + meta — click to expand/collapse */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !editingTitle && setExpanded((e) => !e)}
        >
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { handleSaveTitle(); }
                if (e.key === 'Escape') { setTitleText(todo.text); setEditingTitle(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-sm font-medium focus:outline-none"
              placeholder="Nazwa listy zakupów"
            />
          ) : (
            <p className={`text-sm font-medium leading-snug truncate ${fullyComplete ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
              {todo.text}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {total > 0 ? (
              <>
                <div className="h-1 w-14 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${fullyComplete ? 'bg-emerald-500' : 'bg-primary-500'}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {done}/{total}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">Pusta lista</span>
            )}
          </div>
        </div>

        {/* Edit title */}
        <button
          onClick={(e) => { e.stopPropagation(); setTitleText(todo.text); setEditingTitle(true); setExpanded(true); }}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 transition-all"
          aria-label="Zmień nazwę"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Delete entire list */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
          aria-label="Usuń listę"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Expand chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((s) => !s); }}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          aria-label={expanded ? 'Zwiń' : 'Rozwiń'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Items panel */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800 overflow-hidden animate-expand-panel">
          {sorted.length > 0 && (
            <ul className="pt-2 space-y-1">
              {sorted.map((item) => {
                const isEditing = editingItemId === item.id;
                return (
                  <li
                    key={item.id}
                    className={`
                      flex items-center gap-2 px-2 py-2 rounded-xl
                      ${item.checked ? 'opacity-50' : ''}
                      hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className={`
                        flex-shrink-0 w-5 h-5 rounded-md border-2
                        flex items-center justify-center transition-all duration-200
                        ${item.checked
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                        }
                      `}
                      aria-label={item.checked ? 'Odznacz' : 'Zaznacz'}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {isEditing ? (
                      <input
                        ref={editItemInputRef}
                        value={editingItemText}
                        onChange={(e) => setEditingItemText(e.target.value)}
                        onBlur={handleSaveItemEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { handleSaveItemEdit(); }
                          if (e.key === 'Escape') { setEditingItemId(null); setEditingItemText(''); }
                        }}
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                        className={`flex-1 text-sm leading-snug cursor-text break-words ${item.checked ? 'line-through' : ''}`}
                      >
                        {item.text}
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex-shrink-0 p-1 rounded-md text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                      aria-label="Usuń produkt"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add item input */}
          <div className="flex items-center gap-2 mt-2 px-2">
            <div className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
              </svg>
            </div>
            <input
              ref={newItemInputRef}
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }
              }}
              placeholder="Dodaj produkt..."
              className="flex-1 bg-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none py-1"
            />
            {newItemText.trim() && (
              <button
                onClick={handleAddItem}
                className="text-xs bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 active:scale-95 transition-all"
              >
                Dodaj
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
