"use client";
import React, { useState } from 'react';
import { login, register } from "@/lib/api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const CustomAuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { t } = useTranslation();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      showSuccess(t("common.success_logged_in"));
    } catch (err: any) {
      showError(err?.message || t("common.error"));
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
    try {
      await register({
        email: email.trim(),
        password,
        passwordConfirm: confirmPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      showSuccess(t("common.success_registered"));
      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
    } catch (err: any) {
      showError(err?.message || t("common.error"));
    }
    setLoading(false);
  };

  return (
    <div className="w-full">
      <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5 mt-4">
        {isSignUp && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name-up" className="text-sm font-medium">
                {t("user_profile_page.first_name")}
              </Label>
              <Input
                id="first-name-up"
                type="text"
                placeholder={t("user_profile_page.your_first_name")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name-up" className="text-sm font-medium">
                {t("user_profile_page.last_name")}
              </Label>
              <Input
                id="last-name-up"
                type="text"
                placeholder={t("user_profile_page.your_last_name")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email-auth" className="text-sm font-medium">
            {t("common.email")}
          </Label>
          <Input
            id="email-auth"
            type="email"
            autoComplete="email"
            placeholder={t("common.enter_your_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-auth" className="text-sm font-medium">
            {t("common.password")}
          </Label>
          <Input
            id="password-auth"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder={t("common.enter_your_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
          />
        </div>
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password-auth" className="text-sm font-medium">
              {t("user_profile_page.confirm_new_password")}
            </Label>
            <Input
              id="confirm-password-auth"
              type="password"
              autoComplete="new-password"
              placeholder={t("user_profile_page.confirm_password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>
        )}
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
          {loading ? (
            isSignUp ? t("common.signing_up") : t("common.logging_in")
          ) : (
            isSignUp ? t("common.sign_up") : t("common.sign_in")
          )}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <Button
          type="button"
          variant="link"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => setIsSignUp((prev) => !prev)}
          disabled={loading}
        >
          {isSignUp ? t("common.sign_in") : t("common.sign_up")}
        </Button>
      </div>
    </div>
  );
};

export default CustomAuthForm;
