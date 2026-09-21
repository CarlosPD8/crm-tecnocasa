"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const TYPE_MIN_MS = 45;
const TYPE_JITTER_MS = 55; // human rhythm: each keystroke lands a little differently
const DELETE_MS = 28; // deleting is faster than typing
const HOLD_TYPED_MS = 2400;
const HOLD_EMPTY_MS = 380;
const FIRST_START_MS = 700; // let the line finish its entrance before typing begins

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/**
 * Types a phrase, holds, deletes it and moves to the next one.
 * Purely visual: callers must provide the accessible text separately.
 */
export function Typewriter({ phrases, className }: { phrases: string[]; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [started, setStarted] = useState(false);

  const phrase = phrases[index];

  useEffect(() => {
    if (reduceMotion) return;

    let delay: number;
    let step: () => void;

    if (!started) {
      delay = FIRST_START_MS;
      step = () => setStarted(true);
    } else if (!deleting) {
      if (length < phrase.length) {
        delay = TYPE_MIN_MS + Math.random() * TYPE_JITTER_MS;
        step = () => setLength((l) => l + 1);
      } else {
        delay = HOLD_TYPED_MS;
        step = () => setDeleting(true);
      }
    } else if (length > 0) {
      delay = DELETE_MS;
      step = () => setLength((l) => l - 1);
    } else {
      delay = HOLD_EMPTY_MS;
      step = () => {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      };
    }

    const id = window.setTimeout(step, delay);
    return () => window.clearTimeout(id);
  }, [reduceMotion, started, deleting, length, phrase, phrases.length]);

  // Reduced motion: no typing, just the first phrase, static.
  const visible = reduceMotion ? phrases[0] : phrase.slice(0, length);
  const idle =
    reduceMotion || !started || (!deleting && length === phrase.length) || (deleting && length === 0);

  return (
    <span aria-hidden className={cn("inline", className)}>
      {visible}
      <span
        className={cn(
          "ml-[0.04em] inline-block h-[0.82em] w-[0.055em] translate-y-[0.08em] rounded-full bg-current align-baseline",
          idle && !reduceMotion && "caret-blink"
        )}
      />
    </span>
  );
}
