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
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  outerRef?: React.Ref<HTMLDivElement>;
}

export const VirtualizedMessageList = forwardRef<VirtualizedMessageListHandle, VirtualizedMessageListProps>(
  ({ items, height, className, onScroll, outerRef }, ref) => {
    const listRef = useRef<List>(null);
    const sizeMap = useRef<Map<number, number>>(new Map());

    const getSize = (index: number) => {
      return sizeMap.current.get(index) ?? 80;
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
        const height = rowRef.current?.getBoundingClientRect().height ?? 80;
        setSize(index, height);
      }, [index]);

      return (
        <div style={style} ref={rowRef}>
          {items[index].element}
        </div>
      );
    };

    useImperativeHandle(ref, () => ({
      scrollToItem: (index: number) => {
        listRef.current?.scrollToItem(index);
      },
    }));

    return (
      <List
        height={height}
        itemCount={items.length}
        itemSize={getSize}
        width="100%"
        ref={listRef}
        outerRef={outerRef}
        className={`${className} w-full`}
        onScroll={onScroll}
        style={{ height: height, minHeight: height }}
      >
        {Row}
      </List>
    );
  }
);
