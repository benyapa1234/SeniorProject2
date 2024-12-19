// app.jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Page from './page.jsx';
import Process from './Process.jsx';
import Login from './Login.jsx';
import Navbar from './Component/Navbar.jsx';
import './styles.css';
import './i18n.js';
import AboutData from './aboutData.jsx';
import NotFound from './Component/NotFound.jsx'; 
import EditProgram from './Component/EditProgram.jsx';
import EditPLO from './Component/EditPLO.jsx';
import EditCourse from './Component/EditCourse.jsx';
import EditCLO from './Component/EditCLO.jsx';

function App() {
    const [role, setRole] = useState(null);

    return (
        <>
            <Navbar role={role} />
            <div className="container">
                <Routes>
                    <Route path="/" element={<Login setRole={setRole} />} /> 
                    <Route path="/Page" element={<Page />} />
                    <Route path="/process" element={<Process />} />
                    <Route path="/aboutData" element={<AboutData />} />
                    <Route path="/editprogram" element={<EditProgram/>} />
                    <Route path="/editplo" element={<EditPLO/>} />
                    <Route path="/editcourse" element={<EditCourse />} />
                    <Route path="/editclo" element={<EditCLO />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </>
    );
}

export default App;
