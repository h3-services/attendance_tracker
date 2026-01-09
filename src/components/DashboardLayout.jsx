
import logo from '../assets/logo.png';
import { NavLink } from 'react-router-dom';

const DashboardLayout = ({ children, userProfile = { name: 'Jeevith', role: 'Developer' }, onEditProfile }) => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top Navigation Bar */}
            <header style={{
                backgroundColor: 'transparent',
                borderBottom: 'none',
                padding: '0.75rem 1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                boxShadow: 'none',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                </div>

                {/* Center Title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                    <NavLink to="/" end style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Croissant One', serif", fontWeight: 700, fontSize: '2.5rem' }}>
                            {localStorage.getItem('appCompanyName') || 'Hope3-Services'}
                        </span>
                    </NavLink>
                </div>

                <div
                    onClick={onEditProfile}
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', justifySelf: 'end' }}
                    title="Click to edit profile"
                >
                    <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{userProfile.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{userProfile.role}</div>
                    </div>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600,
                        border: '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                width: '100%',
                maxWidth: '1600px',
                margin: '0 auto',
                padding: '1rem 2rem', // REDUCED
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem'
            }}>
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
