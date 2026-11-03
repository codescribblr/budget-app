import { housekeepingWrite } from "@/lib/housekeeping-route";
export const POST = (request: Request) => housekeepingWrite(request, "goal");
