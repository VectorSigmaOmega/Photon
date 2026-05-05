import { TraceStrip } from "./TraceStrip";
import type { BatchItem } from "../lib/types";

interface Props {
  items: BatchItem[];
}

export function Pipeline({ items }: Props) {
  return <TraceStrip items={items} />;
}
