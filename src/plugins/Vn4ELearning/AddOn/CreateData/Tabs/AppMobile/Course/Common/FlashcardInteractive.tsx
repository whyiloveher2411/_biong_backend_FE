import React from 'react';
import { Box, Typography } from '@mui/material';
import BodyRenderer from './BodyRenderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;

const FlashcardInteractive = ({ flashcard, onUpdate, postId, cIndex, lIndex, fcIndex }: { flashcard: ANY, onUpdate?: (newFc: ANY) => void, postId?: string | number, cIndex?: number, lIndex?: number, fcIndex?: number }) => {
    const [flipped, setFlipped] = React.useState(false);

    const handleUpdateComponent = (side: 'front' | 'back', index: number, newComponent: ANY) => {
        if (onUpdate) {
            const newFc = { ...flashcard };
            if (Array.isArray(newFc[side])) {
                const newSide = [...newFc[side]];
                newSide[index] = newComponent;
                newFc[side] = newSide;
            } else {
                newFc[side] = newComponent;
            }
            onUpdate(newFc);
        }
    };

    return (
        <Box
            onClick={() => setFlipped(!flipped)}
            sx={{
                perspective: '1000px',
                cursor: 'pointer',
                width: '100%',
                height: '100%', // Đảm bảo chiếm toàn bộ chiều cao của cell grid
                '&:hover .card-inner': {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }
            }}
        >
            <Box
                className="card-inner"
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gridTemplateRows: '1fr',
                    width: '100%',
                    height: '100%',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'none',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
            >
                {/* Front Side */}
                <Box
                    sx={{
                        gridArea: '1 / 1', // Stack các mặt lên nhau
                        backfaceVisibility: 'hidden',
                        bgcolor: '#fff',
                        border: '1px solid rgba(33, 150, 243, 0.2)',
                        borderRadius: 4,
                        p: 2,
                        pt: 4, // Tăng padding top để nhường chỗ cho nhãn FRONT
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        wordBreak: 'break-word',
                        minHeight: '180px', // Chiều cao tối thiểu nhẹ để tránh bị quá bẹt
                    }}
                >
                    <Typography variant="overline" sx={{ position: 'absolute', top: 8, left: 16, color: '#2196f3', fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem' }}>FRONT</Typography>
                    <Box sx={{
                        textAlign: 'left',
                        mt: 1,
                        '& h1, & h2, & h3': { fontSize: '1.25rem', lineHeight: 1.2, mb: 1, mt: 1 },
                        '& h4, & h5, & h6': { fontSize: '1.1rem', lineHeight: 1.2, mb: 1, mt: 1 },
                        '& p, & div': { fontSize: '0.9rem', lineHeight: 1.5, mb: 1 },
                        '& .text-block': { lineHeight: 1.5 }
                    }}>
                        {Array.isArray(flashcard.front) ? flashcard.front.map((comp: ANY, i: number) => (
                            <BodyRenderer
                                key={i}
                                component={comp}
                                onUpdate={(newComp) => handleUpdateComponent('front', i, newComp)}
                                context={{ postId, cIndex, lIndex, fcIndex, side: 'front', compIndex: i }}
                            />
                        )) : <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6, fontSize: '1rem' }}>{String(flashcard.front || '')}</Typography>}
                    </Box>
                </Box>

                {/* Back Side */}
                <Box
                    sx={{
                        gridArea: '1 / 1', // Stack các mặt lên nhau
                        backfaceVisibility: 'hidden',
                        bgcolor: '#f8fbff',
                        border: '1px solid rgba(76, 175, 80, 0.2)',
                        borderRadius: 4,
                        p: 2,
                        pt: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        transform: 'rotateY(180deg)',
                        wordBreak: 'break-word',
                        minHeight: '180px',
                    }}
                >
                    <Typography variant="overline" sx={{ position: 'absolute', top: 8, left: 16, color: '#4caf50', fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem' }}>BACK</Typography>
                    <Box sx={{
                        textAlign: 'left',
                        mt: 1,
                        '& h1, & h2, & h3': { fontSize: '1.25rem', lineHeight: 1.2, mb: 1, mt: 1 },
                        '& h4, & h5, & h6': { fontSize: '1.1rem', lineHeight: 1.2, mb: 1, mt: 1 },
                        '& p, & div': { fontSize: '0.9rem', lineHeight: 1.5, mb: 1 },
                        '& .text-block': { lineHeight: 1.5 }
                    }}>
                        {Array.isArray(flashcard.back) ? flashcard.back.map((comp: ANY, i: number) => (
                            <BodyRenderer
                                key={i}
                                component={comp}
                                onUpdate={(newComp) => handleUpdateComponent('back', i, newComp)}
                                context={{ postId, cIndex, lIndex, fcIndex, side: 'back', compIndex: i }}
                            />
                        )) : <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.95rem' }}>{String(flashcard.back || '')}</Typography>}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default FlashcardInteractive;
