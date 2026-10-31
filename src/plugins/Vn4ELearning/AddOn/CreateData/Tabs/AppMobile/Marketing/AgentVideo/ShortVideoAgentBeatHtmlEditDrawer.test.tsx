import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import ShortVideoAgentBeatHtmlEditDrawer from './ShortVideoAgentBeatHtmlEditDrawer';

jest.mock('components/molecules/DrawerCustom', () => ({children, action, open}: React.PropsWithChildren<{action: React.ReactNode; open: boolean}>) => open ? <div>{children}{action}</div> : null);
jest.mock('./SceneAssetBeatSummary', () => () => <div>Asset summary</div>);
jest.mock('hook/useFloatingMessages', () => ({useFloatingMessages: () => ({showMessage: jest.fn()})}));

const html = '<!doctype html><html><body>Updated scene</body></html>';
const props = () => ({open: true, onClose: jest.fn(), beatId: 'beat_2', initialVisualDescription: 'A street scene', initialBackground: 'Teal walls', initialHtml: '', onSave: jest.fn().mockResolvedValue(true), onAiRefine: jest.fn()});

test('manual code is the first input and can be pasted and saved without an AI prompt', async () => {
    const p = props();
    render(<ShortVideoAgentBeatHtmlEditDrawer {...p} sceneAssetsVideoId={67}/>);
    const editor = screen.getByRole('textbox', {name: /HTML beat — nhập/});
    expect(screen.getAllByRole('textbox')[0]).toBe(editor);
    expect(screen.getByRole('button', {name: 'Lưu HTML beat'})).toBeDisabled();
    fireEvent.change(editor, {target: {value: html}});
    fireEvent.click(screen.getByRole('button', {name: 'Lưu HTML beat'}));
    await waitFor(() => expect(p.onClose).toHaveBeenCalled());
    expect(p.onSave).toHaveBeenCalledWith({html, creativePrompt: '', visualDescription: 'A street scene', background: 'Teal walls'});
    expect(p.onAiRefine).not.toHaveBeenCalled();
});

test('an unsuccessful save keeps the manual draft open and parent refresh does not erase it', async () => {
    const p = props(); p.onSave.mockResolvedValue(false);
    const view = render(<ShortVideoAgentBeatHtmlEditDrawer {...p}/>);
    fireEvent.change(screen.getByRole('textbox', {name: /HTML beat — nhập/}), {target: {value: html}});
    view.rerender(<ShortVideoAgentBeatHtmlEditDrawer {...p} initialHtml="Older server HTML"/>);
    expect(screen.getByRole('textbox', {name: /HTML beat — nhập/})).toHaveValue(html);
    fireEvent.click(screen.getByRole('button', {name: 'Lưu HTML beat'}));
    await waitFor(() => expect(p.onSave).toHaveBeenCalled());
    expect(p.onClose).not.toHaveBeenCalled();
});

test('visible prompt buttons call the matching copy action without saving or invoking AI', () => {
    const p = props(), copy = jest.fn(), skill = jest.fn();
    render(<ShortVideoAgentBeatHtmlEditDrawer {...p} onCopyPrompt={copy} onCopySkillPrompt={skill}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Copy prompt sinh HTML beat'}));
    expect(copy).toHaveBeenCalledTimes(1);
    expect(skill).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Copy prompt nạp skill'}));
    expect(skill).toHaveBeenCalledTimes(1);
    expect(p.onSave).not.toHaveBeenCalled();
    expect(p.onAiRefine).not.toHaveBeenCalled();
});
