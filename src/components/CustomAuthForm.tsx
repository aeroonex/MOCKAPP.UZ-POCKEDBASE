"use client";
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CustomAuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // New state to toggle between sign-in and sign-up
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t("common.success_logged_in"));
      navigate('/home');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError(t("user_profile_page.error_password_mismatch"));
      return;
    }
    if (password.length < 6) {
      showError(t("user_profile_page.error_password_length"));
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess(t("common.confirmation_email_sent"));
      // After sign-up, you might want to redirect to a page that tells them to check their email
      // or automatically sign them in if auto-confirm is enabled in Supabase.
      // For now, we'll just show success and let them sign in.
      setIsSignUp(false); // Switch back to sign-in form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
    }
    setLoading(false);
  };

  return (
    <div className="w-full">
      <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4 mt-4">
        {isSignUp && (
          <>
            <div className="space-y-2">
              <Label htmlFor="first-name-up">{t("user_profile_page.first_name")}</Label>
              <Input
                id="first-name-up"
                type="text"
                placeholder={t("user_profile_page.your_first_name")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name-up">{t("user_profile_page.last_name")}</Label>
              <Input
                id="last-name-up"
                type="text"
                placeholder={t("user_profile_page.your_last_name")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email-auth">{t("common.email")}</Label>
          <Input
            id="email-auth"
            type="email"
            placeholder={t("common.enter_your_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-auth">{t("common.password")}</Label>
          <Input
            id="password-auth"
            type="password"
            placeholder={t("common.enter_your_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password-auth">{t("user_profile_page.confirm_new_password")}</Label>
            <Input
              id="confirm-password-auth"
              type="password"
              placeholder={t("user_profile_page.confirm_password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            isSignUp ? t("common.signing_up") : t("common.logging_in")
          ) : (
            isSignUp ? t("common.sign_up") : t("common.sign_in")
          )}
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => setIsSignUp(prev => !prev)} disabled={loading}>
          {isSignUp ? t("common.sign_in") : t("common.sign_up")}
        </Button>
      </div>
    </div>
  );
};

export default CustomAuthForm;