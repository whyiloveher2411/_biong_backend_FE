//@ts-ignore
import { createRoot } from 'react-dom/client';

import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';
import store from './store/configureStore';

const basename = process.env.REACT_APP_BASENAME;



const container = document.getElementById('root');
//@ts-ignore
const root = createRoot(container);
root.render(<ReduxProvider store={store}>
    <BrowserRouter basename={basename}>
        <App />
    </BrowserRouter>
</ReduxProvider>);


// ReactDOM.render(
//     <ReduxProvider store={store}>
//         <BrowserRouter basename={basename}>
//             <App />
//         </BrowserRouter>
//     </ReduxProvider>,
//     document.getElementById('root')
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
