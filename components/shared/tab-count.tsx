export function TabCount({ n }: { n: number }) {
  return (
    <span className="tabular rounded-md bg-secondary px-1.5 py-px text-[0.7rem] font-medium text-muted-foreground in-data-active:bg-accent in-data-active:text-accent-foreground">
      {n}
    </span>
  );
}
