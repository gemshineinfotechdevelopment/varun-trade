import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import { Navbar, type NavTab } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { CategoriesPage } from './components/CategoriesPage';
import { PriceListPage } from './components/PriceListPage';
import { ProductsPage } from './components/ProductsPage';
import { AllCustomersPage } from './components/AllCustomersPage';
import { AddCustomerPage } from './components/AddCustomerPage';
import { ParticularsPage } from './components/ParticularsPage';
import { SettingsPage, getStoredSettings } from './components/SettingsPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('dheeksha_auth_token'));
  });
  const [activeTab, setActiveTab] = useState<NavTab>('All Customers');
  const [customerSubView, setCustomerSubView] = useState<'list' | 'add'>('list');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  useEffect(() => {
    // Clear legacy sticky customer if present
    localStorage.removeItem('dheeksha_active_customer');
    const updateTitle = () => {
      const settings = getStoredSettings();
      if (settings.companyName) {
        document.title = `${settings.companyName} - Billing & Management`;
      }
    };
    updateTitle();
    window.addEventListener('dheeksha_settings_updated', updateTitle);
    return () => {
      window.removeEventListener('dheeksha_settings_updated', updateTitle);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dheeksha_auth_token');
    localStorage.removeItem('dheeksha_auth_user');
    localStorage.removeItem('dheeksha_active_customer');
    setIsAuthenticated(false);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'All Customers') {
      setCustomerSubView('list');
    }
    if (tab === 'Billing') {
      setSelectedCustomerName('');
    }
  };

  const handleCustomerSelectedForParticular = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setActiveTab('Billing');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FEFDF9',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />

        <Box component="main" sx={{ flexGrow: 1, width: '100%', py: 0.5 }}>
          {/* All Customers Tab */}
          {activeTab === 'All Customers' && (
            <>
              {customerSubView === 'add' ? (
                <AddCustomerPage
                  onCancel={() => setCustomerSubView('list')}
                  onSubmitSuccess={() => setCustomerSubView('list')}
                />
              ) : (
                <AllCustomersPage
                  onAddNewCustomer={() => setCustomerSubView('add')}
                  onSelectCustomerForParticular={handleCustomerSelectedForParticular}
                />
              )}
            </>
          )}

          {/* Billing / Particulars Tab */}
          {activeTab === 'Billing' && (
            <ParticularsPage
              initialCustomerName={selectedCustomerName}
            />
          )}

          {/* Categories Tab */}
          {activeTab === 'Categories' && <CategoriesPage />}

          {/* Price List Tab */}
          {activeTab === 'Price List' && <PriceListPage />}

          {/* Products Tab */}
          {activeTab === 'Product' && <ProductsPage />}

          {/* Settings Tab */}
          {activeTab === 'Settings' && <SettingsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
