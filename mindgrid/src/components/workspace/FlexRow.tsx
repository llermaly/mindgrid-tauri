import React, { useState, useRef, useEffect, ReactNode, Children } from 'react';

interface FlexRowProps {
  children: ReactNode;
  direction?: 'horizontal' | 'vertical';
}

/**
 * Resizable flex container that supports both horizontal and vertical layouts.
 * Children can be resized by dragging the handles between them.
 */
export function FlexRow({ children, direction = 'horizontal' }: FlexRowProps) {
  const validChildren = Children.toArray(children).filter(Boolean);
  const [sizes, setSizes] = useState<number[]>(() =>
    validChildren.map(() => 100 / validChildren.length)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({ index: -1, startPos: 0, startSizes: [] as number[] });

  // Reset sizes when children change
  useEffect(() => {
    setSizes(validChildren.map(() => 100 / validChildren.length));
  }, [validChildren.length]);

  if (validChildren.length === 0) return null;
  if (validChildren.length === 1) {
    return <div className="h-full w-full">{validChildren[0]}</div>;
  }

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragInfo.current = {
      index,
      startPos: direction === 'horizontal' ? e.clientX : e.clientY,
      startSizes: [...sizes]
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = direction === 'horizontal' ? rect.width : rect.height;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - dragInfo.current.startPos;
      const deltaPercent = (delta / totalSize) * 100;

      const newSizes = [...dragInfo.current.startSizes];
      const minSize = 10; // minimum 10%

      // Adjust the two adjacent panels
      const idx = dragInfo.current.index;
      let newSize1 = dragInfo.current.startSizes[idx] + deltaPercent;
      let newSize2 = dragInfo.current.startSizes[idx + 1] - deltaPercent;

      // Enforce minimum sizes
      if (newSize1 < minSize) {
        newSize2 -= (minSize - newSize1);
        newSize1 = minSize;
      }
      if (newSize2 < minSize) {
        newSize1 -= (minSize - newSize2);
        newSize2 = minSize;
      }

      newSizes[idx] = Math.max(minSize, newSize1);
      newSizes[idx + 1] = Math.max(minSize, newSize2);
      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      dragInfo.current.index = -1;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={`h-full w-full flex ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      {validChildren.map((child, i) => (
        <React.Fragment key={i}>
          <div
            style={{ [isHorizontal ? 'width' : 'height']: `${sizes[i]}%` }}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            {child}
          </div>
          {i < validChildren.length - 1 && (
            <div
              className={`flex-shrink-0 ${
                isHorizontal
                  ? 'w-1 cursor-col-resize hover:bg-blue-500/50'
                  : 'h-1 cursor-row-resize hover:bg-blue-500/50'
              } bg-neutral-700 transition-colors`}
              onMouseDown={(e) => handleMouseDown(i, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
