import { envelopeCommand } from "./envelope-command-route";
/** Both interfaces use the same atomic, budget-serialized command. */
export async function moveIncomeBuffer(request: Request, direction: "add" | "release") {
  return envelopeCommand(request, `buffer-${direction}`);
}
