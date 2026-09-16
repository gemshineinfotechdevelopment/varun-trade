import { useState, useEffect, type FC, type MouseEvent } from 'react';
import { Box, Typography, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import { getStoredSettings, type CompanySettings } from './SettingsPage';

export type NavTab = 'All Customers' | 'Billing' | 'Price List' | 'Reports' | 'Categories' | 'Product' | 'Settings';

interface NavbarProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onLogout?: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  activeTab = 'All Customers',
  onSelectTab,
  onLogout,
}) => {
  const tabs: NavTab[] = ['All Customers', 'Billing', 'Price List', 'Reports', 'Categories', 'Product', 'Settings'];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getStoredSettings);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCompanySettings(getStoredSettings());
    };
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleTabClick = (tab: NavTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };

  const handleProfileClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleCloseMenu();
    if (onLogout) onLogout();
  };

  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderBottom: '2px solid #FDE68A',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 100%)',
        px: { xs: 2, md: 4 },
        height: '66px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
      }}
    >
      {/* Left Logo Section with Crackers Branding */}
      <Box
        onClick={() => handleTabClick('All Customers')}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
      >
        {companySettings.logoUrl ? (
          <Box
            component="img"
            src={companySettings.logoUrl}
            alt="Company Logo"
            sx={{
              height: 38,
              maxWidth: 50,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              border: '1.5px solid #F59E0B',
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
          >
            <span style={{ fontSize: '20px' }}>🎆</span>
          </Box>
        )}

        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '17px',
              color: '#B91C1C',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {companySettings.companyName || 'Balaji Crackers & Fireworks'}
          </Typography>
          <Typography
            sx={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#D97706',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {companySettings.tagline ? companySettings.tagline : `${companySettings.city || 'Sivakasi'} Dual Pricing Billing Software`}
          </Typography>
        </Box>
      </Box>

      {/* Center Navigation Links */}
      <Box
        component="nav"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2, md: 3 },
          height: '100%',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Box
              key={tab}
              onClick={() => handleTabClick(tab)}
              sx={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Typography
                sx={{
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '14px',
                  color: isActive ? '#B91C1C' : '#57463A',
                  letterSpacing: '-0.01em',
                  px: 0.5,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    color: '#B91C1C',
                  },
                }}
              >
                {tab}
              </Typography>

              {isActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3.5px',
                    background: 'linear-gradient(90deg, #DC2626 0%, #F59E0B 100%)',
                    borderTopLeftRadius: '3px',
                    borderTopRightRadius: '3px',
                    boxShadow: '0 -2px 6px rgba(220, 38, 38, 0.35)',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Right Action Icons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          onClick={handleProfileClick}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            border: '1.5px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
          }}
        >
          <PersonOutlineRoundedIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled sx={{ opacity: '1 !important', py: 1 }}>
            <ListItemIcon>
              <AdminPanelSettingsRoundedIcon sx={{ fontSize: 20, color: '#B91C1C' }} />
            </ListItemIcon>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1F1714' }}>
                Admin Billing Desk
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                Logged In
              </Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              handleTabClick('Reports');
            }}
          >
            <ListItemIcon>
              <AssessmentRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Sales Reports</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              handleTabClick('Settings');
            }}
          >
            <ListItemIcon>
              <SettingsRoundedIcon sx={{ fontSize: 18, color: '#B91C1C' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Software Settings</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogoutClick} sx={{ color: '#DC2626' }}>
            <ListItemIcon>
              <LogoutRoundedIcon sx={{ fontSize: 18, color: '#DC2626' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Logout</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Navbar;
