import { useState, useEffect, type FC, type MouseEvent } from 'react';
import { Box, Typography, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { getStoredSettings, type CompanySettings } from './SettingsPage';

export type NavTab = 'All Customers' | 'Billing' | 'Categories' | 'Price List' | 'Product' | 'Settings';

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
  const tabs: NavTab[] = ['All Customers', 'Billing', 'Categories', 'Price List', 'Product', 'Settings'];
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
      {/* Left Logo Section with Festive Balaji Crackers Gold & Crimson Styling */}
      <Box
        onClick={() => handleTabClick('All Customers')}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer' }}
      >
        {/* Stylized Logo Badge / Uploaded Logo */}
        {companySettings.logoUrl ? (
          <Box
            component="img"
            src={companySettings.logoUrl}
            alt="Company Logo"
            sx={{
              height: 36,
              maxWidth: 48,
              width: 'auto',
              objectFit: 'contain',
              backgroundColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
              display: 'block',
              mr: 0.2,
            }}
          />
        ) : (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              border: '1.5px solid #F59E0B',
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              overflow: 'hidden',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 6H13C16.3137 6 19 8.68629 19 12C19 15.3137 16.3137 18 13 18H7V6Z"
                stroke="#FEF08A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 9.5H13C14.3807 9.5 15.5 10.6193 15.5 12C15.5 13.3807 14.3807 14.5 13 14.5H10V9.5Z"
                fill="#FEF08A"
              />
            </svg>
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
            {companySettings.companyName || 'Dheeksha Trade Link'}
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
            {companySettings.tagline ? companySettings.tagline : `${companySettings.city || 'Sivakasi'} Fireworks & Trade`}
          </Typography>
        </Box>
      </Box>

      {/* Center Navigation Links */}
      <Box
        component="nav"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2.5, md: 4 },
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
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '14.5px',
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

              {/* Active indicator underline bar in Ruby Red with Gold glow */}
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

      {/* Right Action Icons (Profile / Logout) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          onClick={handleProfileClick}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
            border: '1.5px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 6px rgba(30, 64, 175, 0.3)',
            '&:hover': {
              transform: 'scale(1.06)',
              boxShadow: '0 3px 10px rgba(30, 64, 175, 0.4)',
            },
          }}
        >
          <PersonOutlineRoundedIcon sx={{ fontSize: 20, color: '#FFFFFF' }} />
        </Box>

        {/* Profile / Logout Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '12px',
                minWidth: '170px',
                boxShadow: '0 8px 30px rgba(217, 119, 6, 0.15)',
                border: '1.5px solid #FDE68A',
                backgroundColor: '#FFFFFF',
                mt: 1,
              },
            },
          }}
        >
          <MenuItem disabled sx={{ opacity: '1 !important', py: 1.2 }}>
            <ListItemIcon>
              <AdminPanelSettingsRoundedIcon sx={{ fontSize: 20, color: '#B91C1C' }} />
            </ListItemIcon>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1F1714' }}>
                Administrator
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                Logged In
              </Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: '#FEF3C7' }} />
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              handleTabClick('Settings');
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon>
              <SettingsRoundedIcon sx={{ fontSize: 18, color: '#B91C1C' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1F1714' }}>
              Software Settings
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleLogoutClick} sx={{ color: '#DC2626', py: 1 }}>
            <ListItemIcon>
              <LogoutRoundedIcon sx={{ fontSize: 18, color: '#DC2626' }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>
              Logout
            </Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};
