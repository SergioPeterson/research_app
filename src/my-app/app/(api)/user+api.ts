// WIll be called with endpoint /api/user
import { insertUser } from "@/lib/users";
import "dotenv/config";

/**
 * This endpoint is used to insert a user into the database
 * @param request - The request object
 * @returns The response object
 */
export async function POST(request: Request) {
  try {
    const { name, email, clerkId } = await request.json();

    if (!name || !email || !clerkId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await insertUser({ name, email, clerkId });
    return new Response(JSON.stringify(user), { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
