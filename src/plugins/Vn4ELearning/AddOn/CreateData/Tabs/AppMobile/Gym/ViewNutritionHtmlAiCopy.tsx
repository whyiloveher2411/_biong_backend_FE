import React from "react";
import { FieldViewItemProps } from "components/atoms/fields/type";
import LoadingButton from "components/atoms/LoadingButton";
import useAjax from "hook/useApi";

function getTextSimilarity(a: string, b: string) {
    const normalize = (value: string) =>
        value
            .toLowerCase()
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/\s+/g, " ")
            .trim();

    const aTokens = normalize(a).split(" ").filter(Boolean);
    const bTokens = normalize(b).split(" ").filter(Boolean);

    if (!aTokens.length || !bTokens.length) return 0;

    const aTokenSet = new Set(aTokens);
    const bTokenSet = new Set(bTokens);

    let intersectionCount = 0;
    aTokenSet.forEach((token) => {
        if (bTokenSet.has(token)) intersectionCount += 1;
    });

    return (2 * intersectionCount) / (aTokenSet.size + bTokenSet.size);
}

function ViewNutritionHtmlAiCopy(props: FieldViewItemProps) {
    const api = useAjax();

    const cleanText = React.useMemo(() => {
        const rawHtml = String(props.post?.[props.name] ?? "");
        let plainText = rawHtml;

        try {
            const doc = new DOMParser().parseFromString(rawHtml, "text/html");

            doc.querySelectorAll("button").forEach((buttonElement) => {
                buttonElement.replaceWith(doc.createTextNode(" "));
            });

            doc.querySelectorAll("style,script,noscript,template").forEach((node) => node.remove());

            const extractedText = doc.body.innerText || doc.body.textContent || "";

            plainText = extractedText
                .replace(/<[^>]+>/g, " ")
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => {
                    if (!line) return false;

                    const isCssRule =
                        /^\s*[:.#@a-zA-Z0-9_-]+\s*\{/.test(line) ||
                        /--[a-zA-Z0-9-]+\s*:/.test(line) ||
                        /^\s*[a-zA-Z-]+\s*:\s*[^;]+;?\s*$/.test(line) ||
                        /^\s*\}\s*$/.test(line);

                    return !isCssRule;
                })
                .join("\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        } catch (error) {
            plainText = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        }

        const lines = plainText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length === 2) {
            const [firstLine, secondLine] = lines;
            const similarity = getTextSimilarity(firstLine, secondLine);

            if (similarity >= 0.85) {
                return firstLine.length >= secondLine.length ? firstLine : secondLine;
            }
        }

        return plainText;
    }, [props.name, props.post]);

    const handleSyncNutritionHtml = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();

        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/cuisine/update-nutrition_html_ai_table",
            method: "POST",
            data: {
                id: props.post?.id,
                content: e.currentTarget.dataset.text ?? cleanText,
            },
        });
    };

    return (
        <LoadingButton
            variant="contained"
            color="primary"
            className="btn-sync-nutrition-html"
            onClick={handleSyncNutritionHtml}
            data-text={cleanText}
            loading={api.open}
        >
            Update Nutrition Text
        </LoadingButton>
    );
}

export default ViewNutritionHtmlAiCopy;
