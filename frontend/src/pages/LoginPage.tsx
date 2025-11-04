/**
 * LoginPage Component
 *
 * Admin login page with profile selector and conditional tenant selector
 * Uses hardcoded profiles for MVP (development/staging only)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSelector } from '../components/auth/ProfileSelector';
import { TenantSelector } from '../components/auth/TenantSelector';
import { useAuthStore } from '../store/authStore';
import { login, requiresTenantSelection } from '../services/auth/authService';
import { getProfileById } from '../data/profiles';
import type { UserProfile } from '../types/auth';

/**
 * Admin login page
 * Allows selection of hardcoded profile and tenant (if required)
 */
export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Get selected profile to check if tenant selection is needed
  const selectedProfile: UserProfile | undefined = selectedProfileId
    ? getProfileById(selectedProfileId)
    : undefined;

  const showTenantSelector = selectedProfile && requiresTenantSelection(selectedProfile);

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await login({
        profileId: selectedProfileId,
        tenantId: selectedTenantId || undefined,
      });

      if (response.success && response.session) {
        setSession(response.session);
        navigate('/admin');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle profile selection change
   */
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    setSelectedTenantId(''); // Reset tenant selection when profile changes
    setError('');
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select a profile to access the admin panel
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6" onKeyPress={handleKeyPress}>
            {/* Profile Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Profile
              </label>
              <ProfileSelector
                selectedProfileId={selectedProfileId}
                onProfileChange={handleProfileChange}
              />
            </div>

            {/* Tenant Selector (conditional) */}
            {showTenantSelector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant
                </label>
                <TenantSelector
                  profileId={selectedProfileId}
                  selectedTenantId={selectedTenantId}
                  onTenantChange={setSelectedTenantId}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Button */}
            <div>
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading || !selectedProfileId}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </div>

          {/* Development Notice */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Development Mode</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-center text-gray-500">
              This uses hardcoded profiles for development.
              <br />
              Production will use real authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
