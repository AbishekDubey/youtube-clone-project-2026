import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

type TranslationResponse = {
  translatedText?: string;
  error?: string;
};

const LANGUAGE_CODES: Record<
  string,
  string
> = {
  English: "en",
  Hindi: "hi",
  Spanish: "es",
  French: "fr",
  German: "de",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslationResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const {
      text,
      sourceLanguage,
      targetLanguage,
    } = req.body;

    if (
      typeof text !== "string" ||
      !text.trim()
    ) {
      return res.status(400).json({
        error: "Text is required.",
      });
    }

    if (
      text.length >
      500
    ) {
      return res.status(400).json({
        error:
          "Translation text is too long.",
      });
    }

    const sourceCode =
      LANGUAGE_CODES[
        sourceLanguage
      ] || "en";

    const targetCode =
      LANGUAGE_CODES[
        targetLanguage
      ] || "en";

    if (
      sourceCode === targetCode
    ) {
      return res.status(200).json({
        translatedText:
          text,
      });
    }

    const params =
      new URLSearchParams({
        q: text,
        langpair: `${sourceCode}|${targetCode}`,
        mt: "1",
      });

    const response =
      await fetch(
        `https://api.mymemory.translated.net/get?${params.toString()}`
      );

    if (!response.ok) {
      return res.status(502).json({
        error:
          "Translation service is unavailable.",
      });
    }

    const data =
      await response.json();

    const translatedText =
      data?.responseData
        ?.translatedText;

    if (
      typeof translatedText !==
      "string"
    ) {
      return res.status(502).json({
        error:
          "Translation could not be completed.",
      });
    }

    return res.status(200).json({
      translatedText,
    });
  } catch (error) {
    console.error(
      "Translation API error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to translate comment.",
    });
  }
}