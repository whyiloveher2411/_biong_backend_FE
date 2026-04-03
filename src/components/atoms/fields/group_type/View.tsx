import React from "react";
import { FieldViewItemProps } from "../type";
import { Box } from "@mui/material";

function View(props: FieldViewItemProps) {
    let content = props.content;
    let resultAfterFormat = "";

    if (!Array.isArray(content)) {
        try {
            content = JSON.parse(content) ?? {};
        } catch (error) {
            content = {};
        }
    }

    if (content.type) {
        resultAfterFormat =
            props.config.templates[content.type].list_view_format;

        Object.keys(props.config.templates[content.type].sub_fields).forEach(
            (key) => {
                resultAfterFormat = resultAfterFormat.replace(
                    `{{${key}}}`,
                    content[key] ?? "null",
                );
            },
        );
    }

    return <Box dangerouslySetInnerHTML={{ __html: resultAfterFormat }} />;
}

export default View;
