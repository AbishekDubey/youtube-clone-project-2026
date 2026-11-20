import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

const BACKEND_URL =
  "http://localhost:5000/api/videos";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const response = await fetch(
      BACKEND_URL
    );

    const data =
      await response.json();

    if (!response.ok) {
      return res.status(
        response.status
      ).json(data);
    }

    return res.status(200).json(
      data
    );
  } catch (error) {
    console.error(
      "Backend proxy error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to connect to backend server",
    });
  }
}