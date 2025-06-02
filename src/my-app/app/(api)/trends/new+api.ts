import { newest } from "@/lib/trends";

export async function GET(request: Request) {
    const papers = await newest();
    return Response.json({ data: papers }, { status: 200 });
}