import { useState, useRef, useEffect } from 'react';
import type { TodoList } from '../lib/types';

interface ListSelectorProps {
  lists: TodoList[];
  activeList: TodoList | null;
  onSelect: (listId: string) => void;
  onCreateList: (name: string) => void;
  onOpenSettings: (listId: string) => void;
}

export function ListSelector({ lists, activeList, onSelect, onCreateList, onOpenSettings }: ListSelectorProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (creating) {
      inputRef.current?.focus();
    }
  }, [creating]);

  const handleCreate = () => {
    const name = newName.trim();
    if (name) {
      onCreateList(name);
      setNewName('');
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 max-w-[180px]"
      >
        <svg className="w-4 h-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="truncate">{activeList?.name ?? 'Lista'}</span>
        <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-fadeIn">
          {lists.map((list) => (
            <div
              key={list.id}
              className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                list.id === activeList?.id ? 'bg-primary-50 dark:bg-primary-500/10' : ''
              }`}
            >
              <button
                className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate"
                onClick={() => { onSelect(list.id); setOpen(false); }}
              >
                {list.name}
                {list.role !== 'owner' && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {list.role === 'editor' ? 'edytor' : 'podgląd'}
                  </span>
                )}
              </button>
              {list.role === 'owner' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenSettings(list.id); setOpen(false); }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-2 flex gap-2">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleCreate(); } }}
                  placeholder="Nazwa listy..."
                  className="flex-1 text-sm px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleCreate}
                  className="text-xs font-medium px-2 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-2 text-sm text-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                + Nowa lista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
