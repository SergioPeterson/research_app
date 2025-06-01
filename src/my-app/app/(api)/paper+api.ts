import { papers } from "@/lib/papers";

export async function GET(request: Request) {
    try {
        const response = await papers();
        return Response.json({ data: response }, { status: 200 });
    } catch (error) {
        return Response.json({ error: "Failed to get papers" }, { status: 500 });
    }
} 
