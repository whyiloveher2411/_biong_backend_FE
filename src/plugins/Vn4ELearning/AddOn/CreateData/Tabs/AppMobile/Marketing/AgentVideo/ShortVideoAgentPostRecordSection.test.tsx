import React from 'react';
import { render, screen } from '@testing-library/react';
import ShortVideoAgentPostRecordSection from './ShortVideoAgentPostRecordSection';

jest.mock('hook/useFloatingMessages', () => ({ useFloatingMessages: () => ({ showMessage: jest.fn() }) }));

test('shows saved thumbnails and a hint when no post is stored', () => {
    render(<ShortVideoAgentPostRecordSection socialPublish={null} platforms={['youtube']} savedImages={['https://cdn.test/a.jpg']} />);
    expect(screen.getByText(/Chưa lưu bản đăng nào/)).toBeTruthy();
    expect(screen.getByAltText('Thumbnail đã lưu').getAttribute('src')).toBe('https://cdn.test/a.jpg');
});

test('shows every stored field of a post', () => {
    render(
        <ShortVideoAgentPostRecordSection
            platforms={['youtube']}
            socialPublish={{
                posts: {
                    youtube: {
                        status: 'published',
                        title: 'My title',
                        description: 'Long description',
                        tags: ['a', 'b'],
                        first_comment: 'Pinned',
                        thumbnail_url: 'https://cdn.test/t.jpg',
                        url: 'https://youtu.be/abcdefghijk',
                        account: 'What If Lab',
                        made_for_kids: false,
                    },
                    facebook: { description: 'not shown here' },
                },
            }}
        />,
    );
    expect(screen.getByText('Đã đăng')).toBeTruthy();
    expect(screen.getByText('My title')).toBeTruthy();
    expect(screen.getByText('Long description')).toBeTruthy();
    expect(screen.getByText('a, b')).toBeTruthy();
    expect(screen.getByText('What If Lab')).toBeTruthy();
    expect(screen.getByText('Không')).toBeTruthy();
    expect(screen.getByAltText('Thumbnail đã đăng').getAttribute('src')).toBe('https://cdn.test/t.jpg');
    expect(screen.queryByText('not shown here')).toBeNull();
});
