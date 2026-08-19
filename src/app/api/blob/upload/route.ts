import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireGardenAccess } from "@/lib/guards";

/**
 * Issues short-lived client tokens so photos go straight from the phone to the
 * blob store — the bytes never pass through this server, which matters on a
 * weak mobile connection.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // clientPayload carries the garden the photo belongs to; only members
        // with edit rights may upload into it.
        const gardenId = clientPayload ?? "";
        await requireGardenAccess(gardenId, "editContent");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
