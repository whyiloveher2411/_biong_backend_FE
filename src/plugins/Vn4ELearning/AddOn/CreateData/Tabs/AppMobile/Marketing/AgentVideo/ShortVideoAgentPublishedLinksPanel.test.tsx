import React from 'react';
import { render, screen } from '@testing-library/react';
import ShortVideoAgentPublishedLinksPanel from './ShortVideoAgentPublishedLinksPanel';

jest.mock('hook/useFloatingMessages', () => ({ useFloatingMessages: () => ({ showMessage: jest.fn() }) }));

type PanelState = React.ComponentProps<typeof ShortVideoAgentPublishedLinksPanel>['state'];
const stateWith = (socialPublish: unknown) => ({ socialPublish } as unknown as PanelState);

test('shows an empty hint when nothing is published', () => {
    render(<ShortVideoAgentPublishedLinksPanel state={stateWith(null)} />);
    expect(screen.getByText(/chưa đăng lên nền tảng nào/)).toBeTruthy();
});

test('lists links in platform order with account and kind', () => {
    render(
        <ShortVideoAgentPublishedLinksPanel
            state={stateWith({
                links: {
                    tiktok: { url: 'https://www.tiktok.com/@lab/video/1', kind: 'teaser', account: '@lab' },
                    youtube: { url: 'https://youtu.be/abcdefghijk', kind: 'video', account: 'What If Lab' },
                },
            })}
        />,
    );
    const anchors = screen.getAllByRole('link').filter((a) => a.textContent?.startsWith('https://'));
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual([
        'https://youtu.be/abcdefghijk',
        'https://www.tiktok.com/@lab/video/1',
    ]);
    expect(screen.getByText('YouTube')).toBeTruthy();
    expect(screen.getByText('Video đầy đủ')).toBeTruthy();
    expect(screen.getByText('Teaser')).toBeTruthy();
    expect(screen.getByText(/What If Lab/)).toBeTruthy();
});
