import React, { useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { VariableSizeList as List } from 'react-window';

interface Item {
  key: string;
  element: React.ReactNode;
}

export interface VirtualizedMessageListHandle {
  scrollToItem: (index: number) => void;
}

interface VirtualizedMessageListProps {
  items: Item[];
  height: number;
  className?: string;
}

export const VirtualizedMessageList = forwardRef<VirtualizedMessageListHandle, VirtualizedMessageListProps>(
  ({ items, height, className }, ref) => {
    const listRef = useRef<List>(null);
    const sizeMap = useRef<Map<number, number>>(new Map());

    const getSize = (index: number) => {
      return sizeMap.current.get(index) ?? 60;
    };

    const setSize = (index: number, size: number) => {
      if (sizeMap.current.get(index) !== size) {
        sizeMap.current.set(index, size);
        listRef.current?.resetAfterIndex(index);
      }
    };

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const rowRef = useRef<HTMLDivElement>(null);

      useLayoutEffect(() => {
        if (rowRef.current) {
          // Use a small delay to ensure the element is fully rendered
          const timer = setTimeout(() => {
            if (rowRef.current) {
              const height = rowRef.current.getBoundingClientRect().height;
              if (height > 0) {
                setSize(index, height);
              }
            }
          }, 0);
          return () => clearTimeout(timer);
        }
      }, [index]);

      return (
        <div style={style} ref={rowRef} className="px-2 sm:px-4 flex-shrink-0">
          {items[index].element}
        </div>
      );
    };

    useImperativeHandle(ref, () => ({
      scrollToItem: (index: number) => {
        listRef.current?.scrollToItem(index, 'end');
      },
    }));

    return (
      <List
        height={height}
        itemCount={items.length}
        itemSize={getSize}
        width="100%"
        ref={listRef}
        className={className}
        overscanCount={5}
      >
        {Row}
      </List>
    );
  }
);
