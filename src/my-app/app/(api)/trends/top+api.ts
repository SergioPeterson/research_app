import { top } from "@/lib/trends";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    if (!period) {
        return Response.json({ error: "Period is required" }, { status: 400 });
    }
    const papers = await top(period);
    return Response.json({ data: papers }, { status: 200 });
}