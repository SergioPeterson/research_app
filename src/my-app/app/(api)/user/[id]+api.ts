import { getUserByClerkId } from "@/lib/users";


/**
 * This endpoint is used to get a user by their clerk id
 * @param request - The request object
 * @returns The response object
 */
export async function GET(request: Request, { id }: { id: string }) {
    try {
        const user = await getUserByClerkId(id);
        return new Response(JSON.stringify(user), { status: 200 });
    } catch (error) {
        console.error(error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}