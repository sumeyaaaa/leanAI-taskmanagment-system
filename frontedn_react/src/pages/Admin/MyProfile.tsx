import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { employeeService } from '../../services/employee';
import { Button } from '../../components/Common/UI/Button';
import { Card } from '../../components/Common/UI/Card';
import '../Employee/Profile.css';

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  title?: string;
  location?: string;
  experience_years?: number;
  photo_url?: string;
  bio?: string;
  skills?: string[];
  strengths?: string[];
  area_of_development?: string;
  job_description_url?: string;
  linkedin_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const MyProfile: React.FC = () => {
  const { user, getProfile } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      console.log('[MyProfile] Loading admin profile...');
      const profileData = await getProfile();
      console.log('[MyProfile] Received profile data:', profileData);
      if (profileData) {
        const profileObj = profileData as EmployeeProfile;
        setProfile(profileObj);
        setDescription(profileObj.bio || '');
        console.log('[MyProfile] Profile set successfully');
      } else {
        console.error('[MyProfile] Failed to load profile: No data returned');
        setProfile(null);
      }
    } catch (error) {
      console.error('[MyProfile] Failed to load profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await employeeService.uploadEmployeePhoto(profile.id, file);
      if (result.success) {
        await loadProfile();
        alert('Photo uploaded successfully!');
      } else {
        alert(`Failed to upload photo: ${result.error}`);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;

    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    setRemovingPhoto(true);
    try {
      const result = await employeeService.removeEmployeePhoto(profile.id);
      if (result.success) {
        await loadProfile();
        alert('Photo removed successfully!');
      } else {
        alert(`Failed to remove photo: ${result.error}`);
      }
    } catch (error) {
      console.error('Photo removal error:', error);
      alert('Failed to remove photo');
    } finally {
      setRemovingPhoto(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
    setDescription(profile?.bio || '');
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setDescription(profile?.bio || '');
  };

  const handleSaveDescription = async () => {
    if (!profile) return;

    setSavingDescription(true);
    try {
      console.log('[MyProfile] Saving description:', description);
      const result = await employeeService.updateEmployee({
        id: profile.id,
        bio: description
      });

      console.log('[MyProfile] Update result:', result);
      
      if (result && result.id) {
        setProfile(prev => prev ? { ...prev, bio: description } : null);
        setIsEditingDescription(false);
        await loadProfile();
        alert('Description saved successfully!');
      } else {
        console.error('[MyProfile] Update failed: Invalid result', result);
        alert('Failed to save description. Please try again.');
      }
    } catch (error: any) {
      console.error('[MyProfile] Error saving description:', error);
      const errorMessage = error?.message || error?.response?.data?.error || 'Failed to save description. Please try again.';
      alert(errorMessage);
    } finally {
      setSavingDescription(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Profile</h3>
          <p>Unable to load your profile information. Please try again.</p>
          <Button onClick={loadProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Hero Section with Name, Photo, and Key Info */}
      <div className="profile-hero">
        <Card className="profile-hero-card">
          <div className="profile-hero-content">
            <div className="profile-photo-section">
              <div className="photo-wrapper">
                <img
                  src={profile.photo_url || 'https://via.placeholder.com/200x200.png?text=No+Photo'}
                  alt={profile.name}
                  className="profile-photo-large"
                />
                <div className="photo-overlay">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                    style={{ display: 'none' }}
                  />
                  <button
                    className="photo-edit-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    title="Change photo"
                  >
                    {uploadingPhoto ? '📤' : '📷'}
                  </button>
                  {profile.photo_url && (
                    <button
                      className="photo-remove-btn"
                      onClick={handleRemovePhoto}
                      disabled={removingPhoto}
                      title="Remove photo"
                    >
                      {removingPhoto ? '⏳' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
              <div className="status-badge">
                <span className={`status-indicator ${profile.is_active ? 'active' : 'inactive'}`}></span>
                <span>{profile.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="profile-hero-info">
              <div className="profile-name-section">
                <h1 className="profile-name">{profile.name}</h1>
                <div className="profile-title-role">
                  {profile.title && (
                    <span className="profile-title">{profile.title}</span>
                  )}
                  <span className="profile-role">{profile.role}</span>
                </div>
              </div>

              <div className="profile-contact-info">
                <div className="contact-item">
                  <span className="contact-icon">📧</span>
                  <div className="contact-details">
                    <span className="contact-label">Email</span>
                    <a href={`mailto:${profile.email}`} className="contact-value">
                      {profile.email}
                    </a>
                  </div>
                </div>

                {profile.department && (
                  <div className="contact-item">
                    <span className="contact-icon">🏢</span>
                    <div className="contact-details">
                      <span className="contact-label">Department</span>
                      <span className="contact-value">{profile.department}</span>
                    </div>
                  </div>
                )}

                {profile.location && (
                  <div className="contact-item">
                    <span className="contact-icon">📍</span>
                    <div className="contact-details">
                      <span className="contact-label">Location</span>
                      <span className="contact-value">{profile.location}</span>
                    </div>
                  </div>
                )}

                {profile.experience_years !== undefined && (
                  <div className="contact-item">
                    <span className="contact-icon">💼</span>
                    <div className="contact-details">
                      <span className="contact-label">Experience</span>
                      <span className="contact-value">{profile.experience_years} years</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-actions">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link linkedin"
                  >
                    <span>🔗</span> LinkedIn
                  </a>
                )}
                {profile.job_description_url && (
                  <a
                    href={profile.job_description_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link jd-link"
                  >
                    <span>📄</span> Job Description
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Information Cards */}
      <div className="profile-details-grid">
        {/* Description Section */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Card className="profile-detail-card">
            <div className="detail-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="detail-icon">📋</span>
                <h3>Description / Project Summary</h3>
              </div>
              {!isEditingDescription && (
                <button
                  onClick={handleEditDescription}
                  className="bg-leanchem-blue hover:bg-leanchem-navy text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {profile.bio ? 'Edit' : 'Add Description'}
                </button>
              )}
            </div>
            <div className="detail-card-content">
              {isEditingDescription ? (
                <div className="space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter your description, project summary, execution plan, or any detailed information here..."
                    className="w-full min-h-[400px] p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-leanchem-blue focus:border-leanchem-blue resize-y font-mono text-sm leading-relaxed"
                    style={{ fontFamily: 'inherit' }}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelEditDescription}
                      disabled={savingDescription}
                      className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      disabled={savingDescription}
                      className="px-6 py-2 bg-gradient-to-r from-leanchem-navy to-leanchem-blue text-white rounded-lg hover:from-leanchem-blue hover:to-leanchem-navy transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingDescription ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Description
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="description-display">
                  {profile.bio ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800" style={{ fontFamily: 'inherit', margin: 0 }}>
                        {profile.bio}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
                      <svg className="w-12 h-12 text-blue-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 mb-2">No description added yet</p>
                      <p className="text-sm text-gray-500">Click "Add Description" to add your project summary, execution plan, or any detailed information.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Skills Section */}
        <Card className="profile-detail-card">
          <div className="detail-card-header">
            <span className="detail-icon">🛠️</span>
            <h3>Skills</h3>
          </div>
          <div className="detail-card-content">
            {profile.skills && profile.skills.length > 0 ? (
              <div className="tags-container">
                {profile.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty-state">No skills listed yet</p>
            )}
          </div>
        </Card>

        {/* Strengths Section */}
        <Card className="profile-detail-card">
          <div className="detail-card-header">
            <span className="detail-icon">💪</span>
            <h3>Strengths</h3>
          </div>
          <div className="detail-card-content">
            {profile.strengths && profile.strengths.length > 0 ? (
              <div className="tags-container">
                {profile.strengths.map((strength, index) => (
                  <span key={index} className="strength-tag">
                    {strength}
                  </span>
                ))}
              </div>
            ) : (
              <p className="empty-state">No strengths listed yet</p>
            )}
          </div>
        </Card>

        {/* Development Area */}
        {profile.area_of_development && (
          <Card className="profile-detail-card">
            <div className="detail-card-header">
              <span className="detail-icon">📈</span>
              <h3>Area of Development</h3>
            </div>
            <div className="detail-card-content">
              <p className="development-text">{profile.area_of_development}</p>
            </div>
          </Card>
        )}

        {/* Employment Details */}
        <Card className="profile-detail-card">
          <div className="detail-card-header">
            <span className="detail-icon">📋</span>
            <h3>Employment Details</h3>
          </div>
          <div className="detail-card-content">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Employee ID</span>
                <code className="info-value-code">{profile.id}</code>
              </div>
              <div className="info-row">
                <span className="info-label">Employee Since</span>
                <span className="info-value">{formatDate(profile.created_at)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Last Updated</span>
                <span className="info-value">{formatDate(profile.updated_at)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MyProfile;
