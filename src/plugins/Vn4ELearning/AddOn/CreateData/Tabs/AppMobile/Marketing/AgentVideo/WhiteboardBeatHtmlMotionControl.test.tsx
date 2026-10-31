import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WhiteboardBeatHtmlMotionControl from './WhiteboardBeatHtmlMotionControl';

test('Claude and DS remain separate actions on the preview', () => {
    const claude = jest.fn(); const deepseek = jest.fn(); const editor = jest.fn();
    render(<WhiteboardBeatHtmlMotionControl onOpenEditor={editor} onSelectChange={() => true}
        onOpenDeepSeek={deepseek} onOpenClaude={claude} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo HTML beat bằng Claude' }));
    expect(claude).toHaveBeenCalledTimes(1);
    expect(deepseek).not.toHaveBeenCalled();
    expect(editor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('DS'));
    expect(deepseek).toHaveBeenCalledTimes(1);
});

test('Claude cannot be opened twice while session is opening', () => {
    const claude = jest.fn();
    render(<WhiteboardBeatHtmlMotionControl onOpenEditor={() => {}} onSelectChange={() => true}
        onOpenClaude={claude} openingClaude />);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo HTML beat bằng Claude' }));
    expect(claude).not.toHaveBeenCalled();
});
