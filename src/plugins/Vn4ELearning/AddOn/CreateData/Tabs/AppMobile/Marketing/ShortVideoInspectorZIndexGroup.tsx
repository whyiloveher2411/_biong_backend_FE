import React from 'react';
import { InspectorPropertyZIndex } from './ShortVideoInspectorFields';

type Props = {
    zIndex?: number;
    onChange: (value: number | undefined) => void;
};

export default function ShortVideoInspectorZIndexGroup({ zIndex, onChange }: Props) {
    const enabled = zIndex !== undefined;

    return (
        <InspectorPropertyZIndex
            value={zIndex ?? 0}
            enabled={enabled}
            onEnabledChange={(checked) => {
                onChange(checked ? (zIndex ?? 0) : undefined);
            }}
            onValueChange={onChange}
        />
    );
}
