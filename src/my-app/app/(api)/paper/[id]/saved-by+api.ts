import { savedBy } from "@/lib/papers";


export async function GET(request: Request) {
    try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get("paperId");
    if (!paperId) {
        return Response.json({ error: "Paper ID is required" }, { status: 400 });
    }
        const saved = await savedBy(paperId);
        return Response.json({ data: saved }, { status: 200 });
    } catch (error) {
        return Response.json({ error: "Failed to get saved by" }, { status: 500 });
    }
}