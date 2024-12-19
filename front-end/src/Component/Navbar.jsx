import React, { useState } from 'react';
import { Link, useMatch, useResolvedPath } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx'; // For managing class names

export default function Navbar({ role }) {
    const { t, i18n } = useTranslation();
    const [dropdownOpen, setDropdownOpen] = useState(false); // State for toggling Program dropdown
    const [courseDropdownOpen, setCourseDropdownOpen] = useState(false); // State for toggling Course dropdown

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen); // Function to toggle Program dropdown
    const toggleCourseDropdown = () => setCourseDropdownOpen(!courseDropdownOpen); // Function to toggle Course dropdown

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <nav className="nav">
            <Link to="/" className="site-title">PLOCLO</Link>
            <ul className="nav-list">
                {role === "Curriculum Admin" && (
                    <CustomLink to="/Page">{t('Insert Data')}</CustomLink>
                )}
                {role === "Curriculum Admin" && (
                    <CustomLink to="/process">{t('Edit Data')}</CustomLink>
                )}
                {/* Program Dropdown */}
                {role === "Curriculum Admin" && (
                    <li className={clsx("nav-item", { "dropdown": dropdownOpen })}>
                        <button
                            className="btn btn-link dropdown-toggle"
                            onClick={toggleDropdown}
                        >
                            {t('Program')}
                        </button>
                        {dropdownOpen && (
                            <ul className="dropdown-menu">
                                <li><Link to="/editprogram">{t('Edit Program')}</Link></li>
                                <li><Link to="/editplo">{t('Edit PLO')}</Link></li>
                            </ul>
                        )}
                    </li>
                )}

                {/* Course Dropdown */}
                {role === "Curriculum Admin" && (
                    <li className={clsx("nav-item", { "dropdown": courseDropdownOpen })}>
                        <button
                            className="btn btn-link dropdown-toggle"
                            onClick={toggleCourseDropdown}
                        >
                            {t('Course')}
                        </button>
                        {courseDropdownOpen && (
                            <ul className="dropdown-menu">
                                <li><Link to="/editcourse">{t('Edit Course')}</Link></li>
                                <li><Link to="/editclo">{t('Edit CLO')}</Link></li>
                            </ul>
                        )}
                    </li>
                )}

                <CustomLink to="/aboutData">{t('About')}</CustomLink>
            </ul>
            <form className="d-flex">
                <label htmlFor="language-selector" className="me-2 text-white">Select Language:</label>
                <select
                    id="language-selector"
                    className="form-select"
                    onChange={(e) => changeLanguage(e.target.value)}
                    defaultValue={i18n.language}
                >
                    <option value="en">English</option>
                    <option value="ch">Chinese</option>
                </select>
            </form>
        </nav>
    );
}

function CustomLink({ to, children, ...props }) {
    const resolvedPath = useResolvedPath(to);
    const isActive = useMatch({ path: resolvedPath.pathname, end: true });

    return (
        <li className={isActive ? "active" : ""}>
            <Link to={to} {...props}>{children}</Link>
        </li>
    );
}
