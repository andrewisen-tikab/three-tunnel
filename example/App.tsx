import { useEffect, useRef } from 'react';

import _Viewer from './Viewer';

const Viewer = new _Viewer();

import './App.css';

function App() {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current == null) return;
        Viewer.init(ref.current);
        return () => Viewer.dispose();
    }, []);

    return <div id="three" ref={ref} style={{ height: '100%' }} />;
}

export default App;
