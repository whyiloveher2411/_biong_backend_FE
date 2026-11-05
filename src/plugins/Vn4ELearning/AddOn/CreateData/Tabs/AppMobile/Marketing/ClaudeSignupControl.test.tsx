import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import ClaudeSignupControl from './ClaudeSignupControl';
import {readZohoMail,signupClaudeCookie,enqueueClaudeSignups} from 'helpers/marketingShortVideoCookieApi';
jest.mock('helpers/marketingShortVideoCookieApi',()=>({enqueueClaudeSignups:jest.fn(),readZohoMail:jest.fn(),signupClaudeCookie:jest.fn(),parseShortVideoCookieApiMessage:()=>''}));

test('Zoho failure is shown without starting signup',async()=>{
    (readZohoMail as jest.Mock).mockResolvedValue({success:false,error:'Zoho chưa bật IMAP'});
    render(<ClaudeSignupControl onSaved={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Email đăng ký Claude'),{target:{value:'business@spacedev.vn'}});
    fireEvent.click(screen.getByText('Kiểm tra Zoho'));
    expect(await screen.findByText('Zoho chưa bật IMAP')).toBeTruthy();
    expect(readZohoMail).toHaveBeenCalledWith('business@spacedev.vn');
    expect(signupClaudeCookie).not.toHaveBeenCalled();
});
test('successful signup refreshes cookie list',async()=>{
    const saved=jest.fn();(signupClaudeCookie as jest.Mock).mockResolvedValue({success:true,cookie_count:9});
    render(<ClaudeSignupControl onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('Email đăng ký Claude'),{target:{value:'business@spacedev.vn'}});
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Đăng ký Claude và lưu cookie'));
    await waitFor(()=>expect(saved).toHaveBeenCalledTimes(1));
    expect(signupClaudeCookie).toHaveBeenCalledWith('business@spacedev.vn','Spacedev',true);
});

test('signup cannot start before the owner confirms age and terms',()=>{
    (signupClaudeCookie as jest.Mock).mockClear();
    render(<ClaudeSignupControl onSaved={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Email đăng ký Claude'),{target:{value:'business@spacedev.vn'}});
    const button=screen.getByText('Đăng ký Claude và lưu cookie') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(signupClaudeCookie).not.toHaveBeenCalled();
});

test('batch queues email and name rows and reports duplicate skips',async()=>{
    (enqueueClaudeSignups as jest.Mock).mockResolvedValue({success:true,queued:1,skipped:['existing@spacedev.vn'],jobs:[{job_id:42}]});
    render(<ClaudeSignupControl onSaved={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Danh sách tài khoản Claude'),{target:{value:'engineering@spacedev.vn, Engineering\nexisting@spacedev.vn; Existing'}});
    const button=screen.getByText('Tạo queue đăng ký Claude') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(button);
    await waitFor(()=>expect(enqueueClaudeSignups).toHaveBeenCalledWith([
        {email:'engineering@spacedev.vn',display_name:'Engineering'},
        {email:'existing@spacedev.vn',display_name:'Existing'},
    ],true));
    expect(await screen.findByText(/Đã tạo 1 job. Bỏ qua 1 email trùng/)).toBeTruthy();
});
