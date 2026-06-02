import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { STATUSES } from "@/lib/types";

type Params = { params: Promise<{ status: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { status } = await params;
  const validStatus = STATUSES.find((s) => s.key === status);
  if (!validStatus) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const body = await req.json();
  if (!Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
  }
  const result = store.reorder(validStatus.key, body.orderedIds);
  return NextResponse.json(result);
}
