import {validateWorkflowBreakdownPart} from './marketingWorkflowPrompts';
jest.mock('hook/useApi',()=>({ajax:jest.fn()}));
const words='Mai lives in a small apartment with her golden dog, Butter.';
const tagged=`<voice id="giong-dan-truyen">${words}</voice>`;
const output=(text:string)=>`BEAT B01\nSCRIPT SENTENCE:\n${text}\nVISUAL PROMPT:\nMai sits beside Butter in the apartment.`;
test.each([[tagged,words],[words,tagged],[tagged,tagged]])('visual sentence allows optional voice wrappers', (source,sentence)=>{
 expect(validateWorkflowBreakdownPart(output(sentence),[source]).ok).toBe(true);
});
test('multiple voice segments keep every spoken word in order',()=>{
 expect(validateWorkflowBreakdownPart(output('Hello. Hi, Mai.'),['<voice id="a">Hello.</voice> <voice id="b">Hi, Mai.</voice>']).ok).toBe(true);
 expect(validateWorkflowBreakdownPart(output('Mai lives with a cat.'),[tagged]).ok).toBe(false);
});
