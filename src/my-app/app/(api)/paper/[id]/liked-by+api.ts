import { likedBy } from "@/lib/papers";


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paperId = searchParams.get("paperId");
        if (!paperId) {
            return Response.json({ error: "Paper ID is required" }, { status: 400 });
        }
        const liked = await likedBy(paperId);
        return Response.json({ data: liked }, { status: 200 });
    } catch (error) {
        return Response.json({ error: "Failed to get liked by" }, { status: 500 });
    }
}