import React, {
  useRef,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { VariableSizeList as List } from 'react-window';

interface Item {
  key: string;
  element: React.ReactNode;
}

export interface VirtualizedMessageListHandle {
  scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
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
    const isScrollingRef = useRef(false);

    const getSize = useCallback((index: number) => {
      return sizeMap.current.get(index) ?? 80;
    }, []);

    const setSize = useCallback((index: number, size: number) => {
      if (sizeMap.current.get(index) !== size) {
        sizeMap.current.set(index, size);
        if (!isScrollingRef.current) {
          listRef.current?.resetAfterIndex(index);
        }
      }
    }, []);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const rowRef = useRef<HTMLDivElement>(null);

      useLayoutEffect(() => {
        const node = rowRef.current;
        if (!node) return;

        const measure = () => {
          const height = node.getBoundingClientRect().height;
          setSize(index, height);
        };

        // Initial measurement
        measure();

        // Set up resize observer for dynamic content
        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
      }, [index]);

      return (
        <div style={style} ref={rowRef}>
          {items[index]?.element}
        </div>
      );
    };

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
      isScrollingRef.current = true;
      onScroll?.(event);
      
      // Reset scrolling flag after a delay
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    }, [onScroll]);

    useImperativeHandle(ref, () => ({
      scrollToItem: (index: number, align: 'auto' | 'smart' | 'center' | 'end' | 'start' = 'end') => {
        listRef.current?.scrollToItem(index, align);
      },
    }));

    if (!height || items.length === 0) {
      return <div className={className} ref={outerRef} />;
    }

    return (
      <List
        height={height}
        itemCount={items.length}
        itemSize={getSize}
        itemKey={(index) => items[index]?.key || `item-${index}`}
        width="100%"
        ref={listRef}
        outerRef={outerRef}
        className={className}
        onScroll={handleScroll}
        overscanCount={5}
      >
        {Row}
      </List>
    );
  }
);

VirtualizedMessageList.displayName = 'VirtualizedMessageList';