import React, { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  shouldPreventDefault?: boolean;
  delay?: number;
}

const isTouchEvent = (event: React.SyntheticEvent | Event): event is React.TouchEvent => {
  return "touches" in event;
};

const preventDefault = (event: Event | React.SyntheticEvent) => {
  if (!isTouchEvent(event)) return;

  if (event.target instanceof Element && event.target.tagName !== "TEXTAREA" && event.target.tagName !== "INPUT") {
     if (event.cancelable) {
       event.preventDefault();
     }
  }
};

const useLongPress = (
  onLongPress: (event: React.SyntheticEvent) => void,
  onClick: (event: React.SyntheticEvent) => void,
  { shouldPreventDefault = true, delay = 700 }: LongPressOptions = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: React.SyntheticEvent) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener("touchend", preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }
      
      // Store event in a way that doesn't cause issues if accessed later? 
      // Actually we just pass a fresh synthetic event or the original if accessible.
      // For safety, we just trigger the callback.
      
      setLongPressTriggered(false);
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: React.SyntheticEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener("touchend", preventDefault);
      }
      
      if (shouldTriggerClick && !longPressTriggered) {
        onClick(event);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchMove: (e: React.TouchEvent) => clear(e, false), // Cancel on scroll
  };
};

export default useLongPress;