'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Camera, LogOut, ChevronsUpDown, Calendar, Loader } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phoneNumber: user?.phone || '',
    birthday: user?.birthday || '',
    gender: user?.gender || '',
    avatar: user?.avatar || '',
  });

  useEffect(() => {
    if (!user) return;

    setFormData({
      username: user.username || '',
      email: user.email || '',
      phoneNumber: user.phone || '',
      birthday: user.birthday || '',
      gender: user.gender || '',
      avatar: user.avatar || '',
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    if (file.size > 750 * 1024) {
      toast.error('Choose an image smaller than 750 KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: typeof reader.result === 'string' ? reader.result : prev.avatar,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile({
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        birthday: formData.birthday,
        gender: formData.gender as 'Male' | 'Female' | '',
        avatar: formData.avatar,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const toastId = toast.loading('Logging out...');

    try {
      await logout();
      toast.success('Logged out successfully', { id: toastId });
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log out', { id: toastId });
    }
  };

  return (
    <div className="main-container profile-container">
      <header className="profile-header animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="profile-avatar-large">
          <div className="profile-avatar-media" aria-hidden="true">
            {formData.avatar ? (
              <Image
                src={formData.avatar}
                alt={formData.username || user?.username || 'User'}
                width={160}
                height={160}
                unoptimized={formData.avatar.startsWith('data:')}
              />
            ) : (
              <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <button
            type="button"
            className="profile-avatar-edit"
            aria-label="Change profile photo"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={16} color="white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </div>
        <h1 className="profile-name-title">{formData.username || user?.username}</h1>
        <p className="profile-email-subtitle">{formData.email || user?.email}</p>
      </header>

      <div className="profile-sections">
        {/* Personal Information */}
        <section className="profile-section animate-in fade-in slide-in-from-bottom-6 duration-700">
          <h2 className="profile-section-title">
            <User size={22} /> Personal Information
          </h2>
          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-field-group">
              <label className="profile-label">Username</label>
              <input
                type="text"
                name="username"
                className="profile-input"
                value={formData.username}
                placeholder="Username"
                onChange={handleChange}
                autoComplete="username"
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="profile-input"
                value={formData.email}
                placeholder="Email Address"
                disabled
              />
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--muted-foreground)',
                  marginTop: '0.25rem',
                }}
              >
                Email cannot be changed for security reasons.
              </span>
            </div>
            <div className="profile-field-group">
              <label className="profile-label">Phone Number</label>
              <input
                type="number"
                name="phoneNumber"
                className="profile-input"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-label">Birthday</label>
              <div className="profile-select-wrap profile-date-wrap">
                <input
                  type="date"
                  name="birthday"
                  className="profile-input profile-select"
                  value={formData.birthday}
                  onChange={handleChange}
                  autoComplete="bday"
                />
                <span className="profile-select-icon">
                  <Calendar size={18} />
                </span>
              </div>
            </div>
            <div className="profile-field-group">
              <label className="profile-label">Gender</label>
              <div className="profile-select-wrap">
                <select
                  name="gender"
                  className="profile-input profile-select"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <span className="profile-select-icon" aria-hidden="true">
                  <ChevronsUpDown size={18} />
                </span>
              </div>
            </div>
            <button type="submit" className="profile-save-btn" disabled={isSaving || isLoading}>
              {isSaving ? (
                <>
                  <Loader size={18} className="auth-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </section>

        {/* Logout */}
        <section className="profile-section danger-zone animate-in fade-in duration-1000">
          <h2 className="profile-section-title" style={{ color: 'var(--color-red-500)' }}>
            <LogOut size={22} /> Logout
          </h2>
          <div className="security-item" style={{ background: 'rgba(239, 68, 68, 0.03)' }}>
            <div className="security-item-info">
              <span className="security-item-label">Sign out</span>
              <span className="security-item-desc">
                Log out of your Coinnex session on this device
              </span>
            </div>
            <button
              className="danger-btn"
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              disabled={isLoading}
            >
              Logout
            </button>
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Log out?"
        description="You’ll be signed out of your Coinnex session on this device."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await handleLogout();
        }}
      />
    </div>
  );
}
