import React from "react";
import Box from "components/atoms/Box";
import Button from "components/atoms/Button";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface LanguageSelectorProps {
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string }>;
    currentLanguage: string;
    availableLanguages: Array<{ code: string; postId: string | null; isComplete?: boolean }>;
    onNavigateToLanguage: (langCode: string, postId: string) => void;
}

export default function LanguageSelector({
    languages,
    currentLanguage,
    availableLanguages,
    onNavigateToLanguage,
}: LanguageSelectorProps) {
    // Tạo map để dễ lookup
    const availableMap = new Map(
        availableLanguages.map((item) => [item.code, { postId: item.postId, isComplete: item.isComplete || false }])
    );

    return (
        <Box
            sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            {languages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                const langData = availableMap.get(lang.code);
                const postId = langData?.postId;
                const isAvailable = postId !== null && postId !== undefined;
                const isComplete = langData?.isComplete || false;

                return (
                    <Button
                        key={lang.code}
                        variant={isSelected ? "contained" : "outlined"}
                        size="small"
                        color='inherit'
                        disabled={!isAvailable || isSelected}
                        onClick={() => {
                            if (isAvailable && postId && !isSelected) {
                                onNavigateToLanguage(lang.code, postId);
                            }
                        }}
                        startIcon={
                            <Box
                                sx={{
                                    borderRadius: 0.5,
                                    p: 0.25,
                                    display: "flex",
                                    alignItems: "center",
                                    position: "relative",
                                }}
                            >
                                {lang.icon_url ? (
                                    <img
                                        src={lang.icon_url}
                                        alt=""
                                        style={{
                                            width: 20,
                                            height: 15,
                                            objectFit: "cover",
                                            opacity: isAvailable ? 1 : 0.5,
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={`https://flagcdn.com/w20/${lang.flag_code}.png`}
                                        alt=""
                                        style={{
                                            width: 20,
                                            height: 15,
                                            objectFit: "cover",
                                            opacity: isAvailable ? 1 : 0.5,
                                        }}
                                    />
                                )}
                                {isComplete && isAvailable && (
                                    <CheckCircleIcon
                                        sx={{
                                            position: "absolute",
                                            top: -4,
                                            right: -4,
                                            fontSize: 14,
                                            color: "success.main",
                                            backgroundColor: "background.paper",
                                            borderRadius: "50%",
                                        }}
                                    />
                                )}
                            </Box>
                        }
                        sx={{
                            textTransform: "none",
                            minWidth: "auto",
                            px: 1.5,
                            ...(isSelected ? {
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                border: '2px solid',
                                borderColor: 'primary.main',
                                opacity: 1,
                                cursor: 'default',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                },
                            } : {
                                color: 'inherit',
                                opacity: isAvailable ? 1 : 0.5,
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                            }),
                        }}
                    >
                        {lang.title}
                    </Button>
                );
            })}
        </Box>
    );
}
